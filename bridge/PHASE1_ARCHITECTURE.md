# Phase 1: Agent Evolution — Technical Architecture

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│  FLOW: Issue Completion → Evaluation → Memory Update        │
└─────────────────────────────────────────────────────────────┘

STEP 1: Paperclip Issue Completes (status='done')
   ↓
   Bridge.pollPaperclipIssues() detects
   ↓
STEP 2: Extract Posts from Comments
   Bridge.extractPostsFromIssue() parses JSON
   ↓
STEP 3: ⭐ NEW: Evaluate Agent Work
   Bridge.evaluateCompletedIssue(issue)
   ├─ Identify agent type (copywriter, designer, etc)
   ├─ Gather all work (description + comments)
   ├─ Call evaluateAgentWork() from evolution module
   │  └─ Mock Claude evaluation (score 1-10, strengths/weaknesses)
   └─ Determine action:
      ├─ If score >= 7: Save strengths as "strength_pattern"
      ├─ If score < 6: Save weaknesses as "improvement_area"
      └─ Always: Save evaluation record
   ↓
STEP 4: Update Agent Memory
   Bridge.updateAgentMemory()
   ├─ Check if learning already exists (confidence += 0.1)
   ├─ Or create new learning (confidence = 0.6-0.9)
   └─ Supabase: INSERT into agent_learnings
   ↓
STEP 5: Next Briefing Gets Memory Context
   Bridge.createPaperclipIssue()
   ├─ Build briefing text
   ├─ Call buildAgentMemoryContext('cmo_sondar')
   │  └─ Query agent_learnings WHERE confidence > 0.6
   └─ Inject into issue description
   ↓
WEEKLY (every 480 ticks ~4 hours):
   Bridge calls calculateWeeklyPerformance()
   └─ Summarize avg_score, strengths, weaknesses
   └─ Insert into agent_performance_snapshot
```

---

## Database Schema

### Table: `agent_learnings`
```sql
CREATE TABLE agent_learnings (
  id UUID PRIMARY KEY,
  agent_id TEXT,                    -- "copywriter_sondar", "designer_sondar"
  category TEXT,                    -- "style", "client_voice", "forbidden_terms", "skill"
  content TEXT,                     -- "Conversação informal rende mais"
  confidence FLOAT (0-1),           -- Grows from 0.6 → 0.95 as pattern repeats
  source TEXT,                      -- "observed" | "feedback" | "derived"
  derived_from_posts UUID[],        -- IDs of posts that taught this
  last_confirmed TIMESTAMP,         -- When confidence last grew
  created_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_agent_learnings_agent_id ON agent_learnings(agent_id);
CREATE INDEX idx_agent_learnings_confidence ON agent_learnings(confidence DESC);
```

**Usage:**
- When creating briefing, query all rows WHERE agent_id='X' AND confidence > 0.6
- Order by confidence DESC (strongest patterns first)
- Present as bulleted list: "- {category}: {content} ({confidence}%)"

---

### Table: `agent_evaluations`
```sql
CREATE TABLE agent_evaluations (
  id UUID PRIMARY KEY,
  agent_id TEXT,                    -- "copywriter_sondar"
  task_id TEXT,                     -- Issue ID from Paperclip
  evaluation_criteria TEXT,         -- "copywriter" | "designer" | "content_creator"
  self_score FLOAT (1-10),          -- Agent's own score
  evaluation_json JSONB,            -- {strengths: [...], weaknesses: [...], learnings: [...]}
  work_submitted TEXT,              -- Truncated sample of submitted work
  created_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_agent_evaluations_agent_id ON agent_evaluations(agent_id);
CREATE INDEX idx_agent_evaluations_score ON agent_evaluations(self_score DESC);
```

**Sample evaluation_json:**
```json
{
  "score": 8.3,
  "strengths": [
    "Before/after comparisons drive engagement",
    "Clear visual hierarchy",
    "Follows brand guidelines perfectly"
  ],
  "weaknesses": [
    "Could add more context about SPT process",
    "Text in image could be larger"
  ],
  "learnings": [
    "Minimalist designs outperform busy ones",
    "Case studies need concrete numbers"
  ],
  "reasoning": "Solid work, ready for publication with minor tweaks"
}
```

---

### Table: `agent_performance_snapshot`
```sql
CREATE TABLE agent_performance_snapshot (
  id UUID PRIMARY KEY,
  agent_id TEXT,
  week_number INT,                  -- ISO week of year
  posts_created INT,                -- How many tasks completed
  avg_self_score FLOAT,             -- Average score that week
  top_strength TEXT,                -- Best thing they did
  top_weakness TEXT,                -- Thing to improve
  learned_this_week TEXT[],         -- Top learnings from evaluations
  performance_metrics JSONB,        -- {score_range: {min, max}, ...}
  created_at TIMESTAMP
);

-- Index
CREATE INDEX idx_agent_performance_week ON agent_performance_snapshot(week_number DESC);
```

---

## Code Flow: evaluateCompletedIssue()

```javascript
// Location: bridge.mjs, called from pollPaperclipIssues()

async function evaluateCompletedIssue(issue) {
  // 1. Identify agent
  const agentId = issue.assigneeAgentId || 'unknown';
  
  // 2. Gather all work
  const workSubmitted = issue.description + issue.comments.map(c => c.body).join('\n');
  
  // 3. Determine evaluation criteria based on issue title
  let criteriaType = 'default';
  if (issue.title.includes('copy')) criteriaType = 'copywriter';
  if (issue.title.includes('design')) criteriaType = 'designer';
  // ... etc
  
  // 4. Call Claude evaluation (mock for now)
  const evaluation = await evaluateAgentWork(agentId, workSubmitted, {
    criteriaType,
    taskId: issue.id
  });
  
  // 5. Store evaluation
  // → INSERT into agent_evaluations (automatic in evaluateAgentWork)
  
  // 6. Extract and save learnings
  if (evaluation.score >= 7) {
    for (const learning of evaluation.learnings) {
      await updateAgentMemory(agentId, {
        category: 'strength_pattern',
        content: learning,
        source: 'self_evaluation',
        confidence: Math.min(0.9, 0.5 + evaluation.score / 20),
        derivedFromPosts: [issue.id]
      });
    }
  }
  
  if (evaluation.score < 6) {
    for (const weakness of evaluation.weaknesses) {
      await updateAgentMemory(agentId, {
        category: 'improvement_area',
        content: weakness,
        source: 'self_evaluation',
        confidence: 0.7,
        derivedFromPosts: [issue.id]
      });
    }
  }
}
```

---

## Code Flow: buildAgentMemoryContext()

```javascript
// Called when creating new issue (createPaperclipIssue)
// Injects agent's learnings into briefing

async function buildAgentMemoryContext(agentId) {
  // 1. Query high-confidence learnings
  const learnings = await supabase
    .from('agent_learnings')
    .select('*')
    .eq('agent_id', agentId)
    .gte('confidence', 0.6)
    .order('confidence', { ascending: false })
    .limit(10);
  
  // 2. Format as markdown
  let context = `\n## ${agentId} — Aprendizados Acumulados\n`;
  for (const L of learnings) {
    context += `- **${L.category}**: ${L.content} (${L.confidence}%)\n`;
  }
  
  // 3. Add last week's performance
  const lastWeek = await supabase
    .from('agent_performance_snapshot')
    .select('*')
    .eq('agent_id', agentId)
    .order('week_number', { desc: true })
    .limit(1)
    .single();
  
  context += `\n**Última Semana**: ${lastWeek.avg_self_score}/10, melhor em: ${lastWeek.top_strength}\n`;
  
  return context;
}

// USAGE in createPaperclipIssue:
const cmoMemoryContext = await buildAgentMemoryContext('cmo_sondar');
const briefing = originalBriefing + cmoMemoryContext;
// → Agora a issue pra CMO tem sugestões baseadas em aprendizado anterior
```

---

## Confidence Growth Algorithm

```javascript
// When learning is repeated, confidence grows

const CONFIDENCE_INCREMENT = 0.1; // Each repetition +10%

// First encounter:
confidence = 0.6  // "Tentative learning"

// Repeated 2nd time:
confidence = 0.7  // "Emerging pattern"

// Repeated 3rd time:
confidence = 0.8  // "Strong pattern"

// Repeated 4th+ times:
confidence = 0.9  // "Validated pattern"

confidence = Math.min(1.0, confidence + CONFIDENCE_INCREMENT);
```

---

## Agent Type Detection

```javascript
// In evaluateCompletedIssue(), determine which evaluator to use

const AGENT_KEYWORDS = {
  'copywriter': ['copy', 'caption', 'texto'],
  'designer': ['design', 'layout', 'visual', 'image'],
  'content_creator': ['artigo', 'blog', 'article'],
  'social_media': ['social', 'schedule', 'publish'],
};

function detectAgentType(issueTitle) {
  for (const [type, keywords] of Object.entries(AGENT_KEYWORDS)) {
    if (keywords.some(k => issueTitle.toLowerCase().includes(k))) {
      return type;
    }
  }
  return 'default';
}
```

---

## Evaluation Criteria Schemas

```javascript
// Each agent has different evaluation dimensions

const EVALUATION_CRITERIA = {
  copywriter: {
    dimensions: [
      'engagement_potential',
      'brand_voice',
      'clarity',
      'cta_strength',
      'length'
    ]
  },
  
  designer: {
    dimensions: [
      'brand_consistency',
      'readability',
      'composition',
      'technical_accuracy',
      'instagram_specs'
    ]
  },
  
  // ... etc
};

// When evaluating, pass the appropriate criteria to Claude
// Claude scores on those specific dimensions
```

---

## Weekly Performance Calculation

```javascript
// Called every 480 ticks (~4 hours) at regular intervals
// Calculates summary for the week

async function calculateWeeklyPerformance(agentId, weekNumber) {
  // 1. Find all evaluations for this agent this week
  const evaluations = await supabase
    .from('agent_evaluations')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', week_start)
    .lte('created_at', week_end);
  
  // 2. Calculate averages
  const avgScore = evaluations.map(e => e.self_score).average();
  const topStrength = evaluations[0].evaluation_json.strengths[0];
  
  // 3. Extract common learnings
  const learnings = evaluations
    .flatMap(e => e.evaluation_json.learnings)
    .slice(0, 5);
  
  // 4. Store snapshot
  await supabase.from('agent_performance_snapshot').insert({
    agent_id: agentId,
    week_number: weekNumber,
    posts_created: evaluations.length,
    avg_self_score: avgScore,
    top_strength: topStrength,
    learned_this_week: learnings
  });
}
```

---

## Integration Points with Existing Code

### 1. `bridge.mjs` imports
```javascript
import {
  evaluateAgentWork,
  updateAgentMemory,
  buildAgentMemoryContext,
  calculateWeeklyPerformance
} from './modules/agent-evolution.mjs';
```

### 2. Called in `pollPaperclipIssues()`
```javascript
// After extracting posts:
await evaluateCompletedIssue(issue);
```

### 3. Called in `createPaperclipIssue()`
```javascript
// Before sending briefing to CMO:
const cmoMemoryContext = await buildAgentMemoryContext('cmo_sondar');
briefing = briefing + cmoMemoryContext;
```

### 4. Called in `tick()`
```javascript
// Every 480 ticks (weekly):
if (tickCount % 480 === 0) {
  for (const agent of agentsList) {
    await calculateWeeklyPerformance(agent, weekNumber);
  }
}
```

---

## Future Integration: Real Claude Evaluation

Currently `evaluateAgentWork()` returns mock data. To integrate real Claude:

```javascript
// Instead of mock, call:
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const evaluation = await client.messages.create({
  model: "claude-opus-4.6",
  max_tokens: 1024,
  messages: [{
    role: "user",
    content: buildSelfEvaluationPrompt(agentId, work, criteria)
  }]
});

// Parse response JSON
const result = JSON.parse(evaluation.content[0].text);
return {
  score: result.score,
  strengths: result.strengths,
  // ... etc
};
```

**Note:** Anthropic API key must be in .env:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Performance Considerations

### Query Optimization
- `agent_learnings` indexed by agent_id + confidence (common query)
- `agent_evaluations` indexed by agent_id (fast lookup)
- Limit queries to last 10-50 rows (confidence > 0.6)

### Memory Management
- `work_submitted` in agent_evaluations truncated to 1000 chars
- `learned_this_week` in performance_snapshot limited to 5 items
- agent_context_cache refreshed weekly (7-day TTL)

### Supabase Costs
- ~1-2 DB writes per task completion
- ~1 read per briefing creation (memory context)
- 1 bulk write per week (performance snapshot)
- Expected usage: **minimal** (RLS policies + indices keep queries fast)

---

## Monitoring & Observability

### Key Metrics to Track
- Average confidence by agent (should trend 0.6 → 0.85)
- Score distribution (should be ~normal, centered ~7.5)
- Memory context size (should grow weekly)
- Evaluation latency (should be <1s with mock, ~3-5s with real Claude)

### Logging Standards
- `[evolution]` prefix for all agent-evolution logs
- Include agent_id and action
- Examples:
  ```
  [evolution] ✅ copywriter_sondar auto-avaliou: 8.3/10
  [evolution] 🧠 designer_sondar: Novo aprendizado - "strength_pattern"
  [evolution-err] Erro ao atualizar memória: {...}
  ```

---

## Testing Strategy

### Unit Tests (Recommended for Phase 2)
- `evaluateAgentWork()` with mock evaluation
- `updateAgentMemory()` with duplicate checking
- `buildAgentMemoryContext()` with empty DB

### Integration Tests
- Full cycle: issue completion → evaluation → memory update → context injection
- Verify data consistency in agent_learnings vs agent_evaluations
- Check confidence growth on repeated patterns

### Load Testing
- Simulate 20 concurrent issue completions
- Verify no race conditions in confidence updates
- Monitor query performance

---

## Known Limitations (Phase 1)

1. ❌ Claude evaluation is mocked (returns random 7.5-10)
   - **Fix:** Add Anthropic SDK in Phase 2

2. ❌ Agent type detection is keyword-based
   - **Fix:** Use Claude to infer agent type from issue content

3. ❌ No manual feedback from humans
   - **Fix:** Admin panel button "This was actually bad" → updates confidence

4. ❌ Weekly performance calculated manually
   - **Fix:** Trigger automatically on Monday via scheduled function

5. ❌ No specialization detection
   - **Fix:** Phase 3 — analyze performance by pillar

---

## Next Phase Previews

### Phase 2: Emergent Behavior
- Auto-analyze last 8 weeks of performance
- Generate insights: "Cases pillar +45% better than tips"
- Recommendation: "Focus on case studies"

### Phase 3: Agent Forking
- Detect when agent has 3x variance in sub-category
- Suggest fork: "Create copywriter_cases_specialist"
- Clone agent instructions + memory

### Phase 4: Consensus Voting
- When agents disagree → vote
- CMO arbitrates ties
- Record decision as training data

---

## Code Quality Notes

- ✅ All functions have JSDoc comments
- ✅ Error handling with try/catch + logging
- ✅ Lazy initialization of Supabase client
- ✅ Follows existing bridge.mjs conventions
- ⚠️ Mock evaluation should be replaced with real Claude
- ⚠️ No unit tests yet (add in Phase 2)
