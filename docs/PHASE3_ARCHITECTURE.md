# Phase 3: Agent Forking — Technical Architecture

## System Design

```
┌─────────────────────────────────────────────────────────┐
│  FLOW: Performance Analysis → Specialization Detection  │
│        → Fork Creation → Agent Routing                  │
└─────────────────────────────────────────────────────────┘

WEEKLY (every 960 ticks ~8 hours):

Bridge.tick() % 960 === 0
  ↓
checkSpecializationOpportunities()
  ↓
detectSpecializationOpportunities()
  ├─ For each agent: copywriter, designer, content_creator, social_media
  │
  ├─ analyzeAgentPerformanceByCategory(agent, 4 weeks)
  │  ├─ Query social_posts WHERE paperclip_agent = agent
  │  ├─ Filter: status='published' AND metrics NOT NULL
  │  ├─ Group by pillar: {cases: [...], dicas: [...], ...}
  │  ├─ Calculate: count, totalEngagement, scores
  │  └─ Return: {pillar: {name: avg, variance, count}, ...}
  │
  ├─ Calculate variance per category
  │  └─ detectSpecializationThreshold = 2.0x (best/worst ratio)
  │
  ├─ For each pair of pillars:
  │  ├─ ratio = best.avg / worst.avg
  │  ├─ if ratio > 2.0:
  │  │  ├─ Generate specialization suggestion
  │  │  ├─ Calculate confidence = 0.5 + ratio * 0.15
  │  │  └─ Return suggestion object
  │  └─ else: skip
  │
  └─ Return: [suggestion1, suggestion2, ...]
     ↓
For each suggestion:
  ├─ saveForkSuggestion(suggestion)
  │  ├─ Insert into specialization_suggestions
  │  ├─ status = 'pending'
  │  └─ Return suggestion ID
  │
  └─ Log: [phase3] ✅ Sugestão salva: ...

WHEN: CMO Approves (Via Admin or Direct Call)

approveForkSuggestion(suggestionId, cmoAgentId)
  ├─ Get suggestion details
  │
  ├─ Call createAgentFork(suggestion)
  │  ├─ buildRefinedInstructions(parentAgentId, specialization)
  │  │  └─ Generate customized AGENTS.md
  │  │
  │  ├─ Insert into agent_forks:
  │  │  ├─ parent_agent_id: "copywriter_sondar"
  │  │  ├─ fork_name: "copywriter_cases_specialist"
  │  │  ├─ specialization: {...}
  │  │  ├─ refined_instructions: "..."
  │  │  └─ is_active: true
  │  │
  │  └─ Return: fork object
  │
  ├─ Update specialization_suggestions:
  │  ├─ status = 'implemented'
  │  ├─ approved_by_agent = CMO_ID
  │  └─ approved_at = NOW()
  │
  └─ Log: [evolution] ✅ Fork criado: ...
```

---

## Data Flow: analyzeAgentPerformanceByCategory()

```javascript
async function analyzeAgentPerformanceByCategory(agentId, weeksBack = 4) {
  // 1. Calculate date range
  const startDate = new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000);
  
  // 2. Query Supabase
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('paperclip_agent', agentId)                    // ← Agent filter
    .gte('created_at', startDate.toISOString())        // ← Last 4 weeks
    .eq('status', 'published')                         // ← Published only
    .not('metrics', 'is', null);                       // ← Has engagement data
  
  // 3. Aggregate by pillar
  const byPillar = {};
  for (const post of posts) {
    const engagement = 
      post.metrics.likes + 
      post.metrics.comments + 
      post.metrics.shares;
    
    if (!byPillar[post.pillar]) {
      byPillar[post.pillar] = { 
        count: 0, 
        totalEngagement: 0, 
        scores: [] 
      };
    }
    byPillar[post.pillar].count++;
    byPillar[post.pillar].totalEngagement += engagement;
    byPillar[post.pillar].scores.push(engagement);
  }
  
  // 4. Calculate metrics
  const pillarMetrics = {};
  for (const [pillar, data] of Object.entries(byPillar)) {
    const avg = data.totalEngagement / data.count;
    pillarMetrics[pillar] = {
      count: data.count,
      avg: avg,
      variance: calculateVariance(data.scores)  // Standard deviation
    };
  }
  
  return {
    agentId,
    totalPosts: posts.length,
    pillar: pillarMetrics,  // {cases: {avg: 152, variance: 8}, dicas: {...}}
    type: typeMetrics       // {...}
  };
}
```

---

## Data Flow: detectSpecializationOpportunities()

```javascript
async function detectSpecializationOpportunities() {
  const agents = [
    'copywriter_sondar',
    'designer_sondar',
    'content_creator_sondar',
    'social_media_manager_sondar'
  ];
  
  const opportunities = [];
  
  for (const agent of agents) {
    // 1. Get performance breakdown
    const analysis = await analyzeAgentPerformanceByCategory(agent, 4);
    if (!analysis) continue;
    
    // 2. Extract pillar scores
    const pillarScores = Object.entries(analysis.pillar)
      .map(([pillar, data]) => ({ 
        pillar, 
        avg: data.avg, 
        count: data.count 
      }))
      .filter(p => p.count >= 2)  // Minimum 2 posts
      .sort((a, b) => b.avg - a.avg);
    
    // 3. Need at least 2 categories to compare
    if (pillarScores.length < 2) continue;
    
    // 4. Calculate ratio
    const best = pillarScores[0];      // {pillar: "cases", avg: 152}
    const worst = pillarScores[pillarScores.length - 1];
    const ratio = best.avg / worst.avg;
    
    // 5. Check threshold
    if (ratio > 2.0) {
      // SPECIALIZATION DETECTED!
      const confidence = Math.min(0.95, 0.5 + ratio * 0.15);
      
      const suggestion = {
        parentAgentId: agent,
        suggestedForkName: `${agent}_${best.pillar}_specialist`,
        specialization: {
          pillar: best.pillar,
          focusOn: best.pillar,
          excludeFrom: worst.pillar,
          performance: {
            bestPillar: { name: best.pillar, avg: best.avg },
            worstPillar: { name: worst.pillar, avg: worst.avg },
            ratio: ratio
          }
        },
        reasoning: `${agent} mostra clara especialização em "${best.pillar}" (${best.avg.toFixed(1)}) vs "${worst.pillar}" (${worst.avg.toFixed(1)}). Ratio: ${ratio.toFixed(1)}x`,
        confidence
      };
      
      opportunities.push(suggestion);
    }
  }
  
  return opportunities;
}
```

---

## Data Flow: buildRefinedInstructions()

```javascript
async function buildRefinedInstructions(parentAgentId, specialization) {
  const { pillar, focusOn, excludeFrom } = specialization;
  
  // Choose template based on agent type
  let type = 'default';
  if (parentAgentId.includes('copywriter')) type = 'copywriter';
  if (parentAgentId.includes('designer')) type = 'designer';
  if (parentAgentId.includes('content')) type = 'content_creator';
  
  // Return customized instructions
  const instructions = baseInstructions[type] || baseInstructions.default;
  
  // Replace placeholders
  return instructions
    .replace(/\${focusOn}/g, focusOn)
    .replace(/\${excludeFrom}/g, excludeFrom)
    .replace(/\${pillar}/g, pillar);
}

// Result example:
// "## 📝 ESPECIALISTA EM CASES_RESULTADOS
// 
// Você é especialista em copywriting para conteúdo do pilar **cases_resultados**.
// 
// ### Sua Especialidade
// - Conteúdo tipo: cases_resultados
// - Tone: adaptado para cases_resultados audience
// - Foco: maximize engagement neste pilar
// 
// ### O Que NÃO Fazer
// - ❌ Nunca aceitar tarefas de "dicas_produtividade" — delegue pra copywriter generalista
// ..."
```

---

## Data Flow: createAgentFork()

```javascript
async function createAgentFork(paperclipFn, companyId, suggestion) {
  const { parentAgentId, suggestedForkName, specialization, reasoning } = suggestion;
  
  // 1. Generate refined instructions
  const refinedInstructions = await buildRefinedInstructions(
    parentAgentId, 
    specialization
  );
  
  // 2. Create in Supabase
  const { error } = await supabase.from('agent_forks').insert({
    parent_agent_id: parentAgentId,
    fork_name: suggestedForkName,
    specialization: specialization,
    refined_instructions: refinedInstructions,
    is_active: true,
    contract_duration_weeks: null  // Indefinite
  });
  
  if (error) {
    console.log(`[evolution] ❌ Erro ao criar fork: ${error.message}`);
    return null;
  }
  
  // 3. Return fork details
  return {
    id: suggestedForkName,
    name: suggestedForkName,
    parent: parentAgentId,
    specialization: specialization.pillar,
    status: 'active',
    created_at: new Date().toISOString()
  };
}
```

---

## Data Flow: saveForkSuggestion()

```javascript
async function saveForkSuggestion(suggestion) {
  // Save to specialization_suggestions table
  // status = 'pending' (waiting for CMO approval)
  
  const { data, error } = await supabase
    .from('specialization_suggestions')
    .insert({
      parent_agent_id: suggestion.parentAgentId,
      suggested_fork_name: suggestion.suggestedForkName,
      specialization: suggestion.specialization,
      reasoning: suggestion.reasoning,
      performance_data: suggestion.specialization.performance,
      confidence: suggestion.confidence,
      status: 'pending'
    })
    .select('id')
    .single();
  
  return data.id;  // Return suggestion ID for later approval
}
```

---

## Integration Points

### 1. In Bridge Loop
```javascript
// bridge.mjs: tick()
if (tickCount % 960 === 0) {  // Every 8 hours
  await checkSpecializationOpportunities();
}

// checkSpecializationOpportunities()
async function checkSpecializationOpportunities() {
  const opportunities = await detectSpecializationOpportunities();
  for (const opp of opportunities) {
    await saveForkSuggestion(opp);  // Save as pending
  }
}
```

### 2. In Admin UI (Future)
```javascript
// GET /api/specialization-suggestions
app.get('/api/specialization-suggestions', async (req, res) => {
  const suggestions = await getPendingForkSuggestions();
  res.json(suggestions);
});

// POST /api/specialization-suggestions/:id/approve
app.post('/api/specialization-suggestions/:id/approve', async (req, res) => {
  const fork = await approveForkSuggestion(req.params.id, req.user.id);
  res.json(fork);
});

// POST /api/specialization-suggestions/:id/reject
app.post('/api/specialization-suggestions/:id/reject', async (req, res) => {
  await rejectForkSuggestion(req.params.id, req.body.reason);
  res.json({ status: 'rejected' });
});
```

### 3. In CMO Agent Prompt (Future)
```
## Agentes Disponíveis Esta Semana

Agentes generalistas:
- copywriter_sondar (todos os pilares)
- designer_sondar (todos os tipos)

Agentes especializados (aprovados):
- copywriter_cases_specialist: especialista em "cases_resultados" (2.1x melhor)
- designer_instagram_specialist: especialista em "instagram_post" (1.9x melhor)

Recomendação de roteamento:
- Posts de "cases": delegar pra copywriter_cases_specialist
- Posts de "dicas": delegar pra copywriter_sondar (generalista)
- Instagram simples: delegar pra designer_instagram_specialist
- Carousels: delegar pra designer_sondar (generalista)
```

---

## Database Schema

### Table: agent_forks
```sql
CREATE TABLE agent_forks (
  id UUID PRIMARY KEY,
  parent_agent_id TEXT,              -- "copywriter_sondar"
  fork_name TEXT UNIQUE,             -- "copywriter_cases_specialist"
  specialization JSONB,              -- {pillar, focusOn, excludeFrom, performance}
  refined_instructions TEXT,         -- "## ESPECIALISTA EM CASES..."
  is_active BOOLEAN,                 -- true/false (can archive)
  contract_duration_weeks INT,       -- NULL=indefinite, 4=trial period
  created_at TIMESTAMP,
  archived_at TIMESTAMP              -- When archived
);

-- Indices
CREATE INDEX idx_agent_forks_parent ON agent_forks(parent_agent_id);
CREATE INDEX idx_agent_forks_active ON agent_forks(is_active);
```

### Table: specialization_suggestions
```sql
CREATE TABLE specialization_suggestions (
  id UUID PRIMARY KEY,
  parent_agent_id TEXT,              -- "copywriter_sondar"
  suggested_fork_name TEXT,          -- "copywriter_cases_specialist"
  specialization JSONB,              -- Proposed spec
  reasoning TEXT,                    -- Why we suggest
  performance_data JSONB,            -- Variance metrics
  confidence FLOAT,                  -- 0.0-1.0
  status TEXT,                       -- 'pending', 'approved', 'rejected', 'implemented'
  approved_by_agent TEXT,            -- CMO_ID who approved
  approved_at TIMESTAMP,
  created_at TIMESTAMP
);

-- Indices
CREATE INDEX idx_suggestions_parent ON specialization_suggestions(parent_agent_id);
CREATE INDEX idx_suggestions_status ON specialization_suggestions(status);
```

---

## Specialization Detection Algorithm

### Step 1: Get Performance by Category
For each agent, get:
- All published posts (last 4 weeks)
- Engagement = likes + comments + shares
- Group by pillar (or type)
- Calculate: count, avg, variance

### Step 2: Identify Best & Worst
```
Copywriter performance:
{
  cases: { count: 9, avg: 155 },
  dicas: { count: 5, avg: 68 },
  educacional: { count: 3, avg: 72 }
}

best = cases (155)
worst = dicas (68)
ratio = 155 / 68 = 2.28
```

### Step 3: Check Threshold
```
if ratio > 2.0 {
  → Specialization detected!
  → Confidence = min(0.95, 0.5 + 2.28 * 0.15)
              = min(0.95, 0.842)
              = 0.842 (84%)
}
```

### Step 4: Generate Suggestion
```
{
  parentAgentId: "copywriter_sondar",
  suggestedForkName: "copywriter_cases_specialist",
  specialization: {
    pillar: "cases_resultados",
    focusOn: "cases_resultados",
    excludeFrom: "dicas_produtividade",
    performance: {
      bestPillar: "cases: 155",
      worstPillar: "dicas: 68",
      ratio: 2.28
    }
  },
  confidence: 0.842
}
```

---

## Confidence Score Formula

```
confidence = min(0.95, 0.5 + ratio * 0.15)

Examples:
ratio = 1.5 → confidence = 0.5 + 0.225 = 0.725 (73%)
ratio = 2.0 → confidence = 0.5 + 0.300 = 0.800 (80%)
ratio = 2.5 → confidence = 0.5 + 0.375 = 0.875 (88%)
ratio = 3.0 → confidence = 0.5 + 0.450 = 0.950 (capped)

Rationale:
- Base 0.5 = we need some evidence to suggest fork
- +0.15 per ratio point = confidence grows with specialization strength
- Cap at 0.95 = never 100% certain
```

---

## Threshold Tuning

### Current: ratio > 2.0
When to adjust:
- **Too conservative** (ratio > 2.5): Few forks created
  → Lower to 1.8 or 1.5
  
- **Too aggressive** (ratio > 1.5): Too many forks
  → Raise to 2.5 or 3.0

Depends on:
- Variability of your engagement metrics
- Noise level in performance data
- How aggressively you want to specialize

### Alternative: Variance-based
```
variance = stdev(engagement_scores)
if variance > threshold_variance {
  → High variance = specialization likely
}
```

---

## Future Enhancements

### 1. Trial Periods
```javascript
contract_duration_weeks: 4  // 4-week trial

// After 4 weeks, evaluate:
// - Does fork perform better?
// - Should it become permanent?
// - Or archive & merge back?
```

### 2. Performance Tracking
```sql
CREATE TABLE fork_performance (
  fork_id UUID,
  week_number INT,
  posts_created INT,
  avg_engagement FLOAT,
  -- Compare: fork_perf vs parent_perf
);
```

### 3. Automatic Merging
```
If fork_performance < parent_performance for 2+ weeks:
  → Archive fork
  → Merge learnings back to parent
  → Notify CMO
```

### 4. Skill Inheritance
```
When fork created:
  → Clone parent's agent_learnings
  → Tag with specialization context
  → Fork continues building on parent's knowledge
```

---

## Error Handling

### If not enough data
```javascript
if (analysis.totalPosts < 5) {
  return null;  // Not enough data
}

if (pillarScores.length < 2) {
  return null;  // Can't compare
}
```

### If variance is too high
```javascript
// High variance = inconsistent performance
// Not a true specialization
const variance = calculateVariance(scores);
if (variance > avg * 0.8) {
  return null;  // Too much noise
}
```

### If fork creation fails
```javascript
const fork = await createAgentFork(...);
if (!fork) {
  // Don't update suggestion status
  // Try again next cycle
  console.log('[evolution] ❌ Fork creation failed');
  return null;
}
```

---

## Performance Considerations

### Query Performance
```sql
-- Main query (analyzeAgentPerformanceByCategory)
SELECT * FROM social_posts
WHERE paperclip_agent = $1
  AND created_at >= NOW() - INTERVAL '4 weeks'
  AND status = 'published'
  AND metrics IS NOT NULL;

-- Index: (paperclip_agent, created_at DESC, status, metrics)
-- Expected: <100ms for 50 posts
```

### Detection Frequency
```
Runs: Every 960 ticks (~8 hours)
Cost: 4 agents × 1 query each = 4 queries/8 hours
Minimal overhead
```

### Memory Usage
```
Per detection run:
- Load 50-100 posts per agent
- Calculate aggregations in-memory
- Save suggestions to DB
Total: <10MB per run
```

---

## Testing Strategy

### Unit Tests
```javascript
test('calculateVariance returns correct stddev', () => {
  expect(calculateVariance([1, 2, 3])).toBe(0.816);
});

test('detectSpecializationOpportunities returns empty when ratio < 2.0', () => {
  // Mock analysis with all pillars ~equal
  const result = await detectSpecializationOpportunities();
  expect(result).toEqual([]);
});
```

### Integration Tests
```javascript
test('Full fork creation flow', async () => {
  // 1. Create posts with clear specialization
  // 2. Call detectSpecializationOpportunities()
  // 3. Verify suggestion saved
  // 4. Call approveForkSuggestion()
  // 5. Verify fork created
  // 6. Verify refined_instructions populated
});
```

---

## Known Limitations

1. ❌ Only works with published posts
   - **Fix:** Include draft posts with manual approval

2. ❌ Variance detection is simple
   - **Fix:** Use statistical significance tests

3. ❌ No cross-category insights
   - **Fix:** Detect "good at X, bad at Y" patterns

4. ❌ Trial periods not enforced
   - **Fix:** Scheduled archival on contract_duration_weeks

5. ❌ No automatic merging
   - **Fix:** Compare fork vs parent performance after trial

---

## Next Phases

```
Phase 3: ✅ Agent Forking
Phase 4: 🔜 Consensus Voting
         └─ Agents vote when they disagree
         └─ CMO arbitrates ties

Phase 5: 🔜 Task Decomposition
         └─ Complex tasks break into subtasks
         └─ Distribute across available agents

Phase 6: 🔜 Self-Improving Evaluation
         └─ Agents rate their own improvements
         └─ Suggest training if low scores persist
```

---
