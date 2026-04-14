# Phase 5: Architecture — Self-Improving Evaluation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│               PHASE 5: SELF-IMPROVING EVALUATION                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Feedback Loop:                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Task completes → submitFeedbackResult()           │       │
│  │    (expected vs actual engagement/quality/time)      │       │
│  │                                                       │       │
│  │ 2. Analyze patterns → discoverLearningPatterns()    │       │
│  │    (timing, expertise, consistency)                 │       │
│  │                                                       │       │
│  │ 3. Update skills → updateAgentSkills()              │       │
│  │    (proficiency +0.02 per success, -0.01 per fail)  │       │
│  │                                                       │       │
│  │ 4. Detect degradation → detectPerformanceDegradation│       │
│  │    (if recent 2 avg << previous 5 avg → alert)      │       │
│  │                                                       │       │
│  │ 5. Generate recommendations → generateRecommendations│      │
│  │    (task assignment, skill dev, agent pairing)      │       │
│  │                                                       │       │
│  │ 6. Inject to briefing → getAgentLearningContext()   │       │
│  │    (add patterns + skills + recommendations)        │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  Bridge.tick() every 30s                                        │
│  └─ analyzeAgentLearning() [every 240 ticks = ~2 horas]        │
│     ├─ discoverLearningPatterns() for each agent               │
│     ├─ detectPerformanceDegradation() for each agent           │
│     └─ generateRecommendations() for each agent                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### feedback_results
```
id: UUID (Primary Key)
issue_id: TEXT (Paperclip issue: "issue#456")
agent_id: TEXT ("copywriter_sondar")
decision_id: UUID (optional, links to Phase 4 decision)
task_type: TEXT ∈ {content_creation, design, strategy, etc}
metric_type: TEXT ∈ {engagement, quality, time, cmo_rating}
expected_value: FLOAT (what we expected: 150 likes)
actual_value: FLOAT (what we got: 200 likes)
success_percentage: FLOAT 
  = (actual / expected) * 100
  → 133% means beat expectations by 33%
feedback_text: TEXT (CMO's qualitative feedback)
status: TEXT ∈ {pending, evaluated, learned}
created_at: TIMESTAMP
evaluated_at: TIMESTAMP

Indices:
  - feedback_results(agent_id)
  - feedback_results(issue_id)
  - feedback_results(status)

Semantics:
  - expected < actual: agent exceeded expectations
  - expected > actual: agent underperformed
  - actual == expected: exactly as expected
```

### agent_learning_patterns
```
id: UUID (Primary Key)
agent_id: TEXT ("copywriter_sondar")
task_type: TEXT ("content_creation")
pattern: TEXT 
  - "Posts on Tuesday have 95% success"
  - "copywriter_sondar has 89% expertise in cases"
  - "5/5 recent tasks were highly successful"
pattern_category: TEXT ∈ {timing, expertise, consistency, style, audience}
confidence: FLOAT [0-1]
  - 0.95: very confident pattern
  - 0.7: moderately confident
  - < 0.7: weak pattern (not saved)
times_validated: INT (how many times confirmed)
first_discovered_at: TIMESTAMP
last_validated_at: TIMESTAMP

Indices:
  - agent_learning_patterns(agent_id, task_type)
  - agent_learning_patterns(confidence DESC)

Semantics:
  Patterns grow confidence as they're repeatedly validated.
  If pattern is repeated 5 times, confidence increases 0.05 each time.
```

### performance_degradation
```
id: UUID (Primary Key)
agent_id: TEXT
task_type: TEXT (optional, "design" or null for all)
previous_avg_score: FLOAT (avg of 5 previous tasks)
current_avg_score: FLOAT (avg of 2 most recent tasks)
degradation_percentage: FLOAT
  = ((previous - current) / previous) * 100
probable_cause: TEXT
  - "Possível esgotamento ou mudança de instrução"
  - "Task complexity increased"
  - "External factors (tool changes)"
status: TEXT ∈ {alert, acknowledged, resolved}
created_at: TIMESTAMP

Indices:
  - performance_degradation(agent_id)
  - performance_degradation(status)

Semantics:
  Alert triggered if degradation > 15%
  CMO must acknowledge before status moves to "resolved"
```

### agent_skills
```
id: UUID (Primary Key)
agent_id: TEXT ("copywriter_sondar")
skill_name: TEXT ("copywriting", "design", "seo", "engagement_tactics")
proficiency_level: FLOAT [0-1]
  - 0.9+: expert
  - 0.7-0.89: proficient
  - 0.5-0.69: competent
  - < 0.5: developing
times_used: INT (how many tasks using this skill)
success_rate: FLOAT [0-1]
  = (successful_tasks / total_tasks)
last_used_at: TIMESTAMP
updated_at: TIMESTAMP

Composite Index:
  - agent_skills(agent_id)
  - agent_skills(proficiency_level DESC)

Proficiency Growth:
  - Start: 0.3 (developing) or 0.6 (new skill with success)
  - Per success: +0.02
  - Per failure: -0.01
  - Capped: [0.0, 1.0]

Success Rate:
  Tracks empirical success independently of proficiency.
  If proficiency 0.8 but success_rate 0.5, agent is not living up to skill level.
```

### learning_events
```
id: UUID (Primary Key)
agent_id: TEXT
event_type: TEXT ∈ {
  pattern_discovered,
  accuracy_improved,
  skill_upgraded,
  issue_detected,
  recommendation_generated
}
description: TEXT ("Pattern: posts on Tuesday have 95% success")
old_value: FLOAT (before: confidence 0.7)
new_value: FLOAT (after: confidence 0.95)
impact_score: FLOAT [0-1]
  - 0.9+: major learning event
  - 0.5-0.89: moderate
  - < 0.5: minor
created_at: TIMESTAMP

Indices:
  - learning_events(agent_id)
  - learning_events(event_type)

Semantics:
  Audit log of agent learning. Tracks all discoveries, improvements, issues.
  Used for generating learning narrative in dashboards.
```

### ai_recommendations
```
id: UUID (Primary Key)
issue_id: TEXT (optional, "issue#456")
agent_id: TEXT ("copywriter_sondar")
recommendation_type: TEXT ∈ {
  task_assignment,     → "increase copywriting tasks by 20%"
  skill_development,   → "train in mobile design"
  process_change,      → "always publish on Tuesdays"
  agent_pairing        → "pair copywriter with designer"
}
title: TEXT
description: TEXT
reasoning: TEXT (why we recommend this)
confidence: FLOAT [0-1]
potential_impact: TEXT ("engagement +20%", "time -15%")
status: TEXT ∈ {pending, accepted, rejected, implemented}
accepted_at: TIMESTAMP
created_at: TIMESTAMP

Indices:
  - ai_recommendations(agent_id)
  - ai_recommendations(status)

Semantics:
  CMO-facing recommendations based on discovered patterns.
  Tracks acceptance/rejection for learning what CMO values.
```

## Function Specifications

### submitFeedbackResult(issueId, agentId, taskType, metricType, expectedValue, actualValue, feedbackText)

**Purpose**: Register outcome of a completed task.

**Inputs**:
- issueId: TEXT — Paperclip issue ID
- agentId: TEXT — which agent executed the task
- taskType: TEXT — 'content_creation', 'design', 'strategy'
- metricType: TEXT — 'engagement', 'quality', 'time', 'cmo_rating'
- expectedValue: FLOAT — target metric (e.g., 150 likes)
- actualValue: FLOAT — achieved metric (e.g., 200 likes)
- feedbackText: TEXT — CMO's comment

**Process**:
```
1. Calculate success_percentage = (actualValue / expectedValue) * 100
2. Insert into feedback_results with status='pending'
3. Log: "[phase5] 📊 Feedback registrado: {agentId} em {taskType} ({success_pct}% sucesso)"
4. Return feedback record
```

**Success Interpretation**:
- > 100%: exceeded expectations
- 80-100%: met expectations
- < 80%: underperformed

---

### discoverLearningPatterns(agentId, taskType, weeksBack = 4)

**Purpose**: Detect success patterns in agent's feedback history.

**Inputs**:
- agentId: TEXT
- taskType: TEXT
- weeksBack: INT — analyze last N weeks (default 4)

**Process**:
```
1. Query feedback_results for this agent in last N weeks
   IF < 5 feedbacks:
     Log warning, return []

2. Detect timing pattern:
   Group by day-of-week (Monday, Tuesday, etc)
   IF any day has avg success > 85%:
     Pattern: "{day} posts have {avg}% success"

3. Detect expertise pattern:
   Calculate avg success across all tasks
   IF avg > 85% AND >= 5 tasks:
     Pattern: "{agent} has {avg}% expertise in {taskType}"

4. Detect consistency pattern:
   Calculate variance of success percentages
   IF low variance (all scores close together):
     Pattern: "{agent} is consistent: {count}/{total} successful"

5. Save each pattern:
   Check if pattern already exists (same text)
   IF exists:
     Update: confidence += 0.05, times_validated++
   ELSE:
     Insert new pattern with confidence

6. Log discoveries:
   "[phase5] 🎯 Padrão descoberto: \"{pattern}\" (conf: {confidence})"

7. Return list of discovered patterns
```

**Confidence Calculation**:
```
confidence = 0.6 + (success_percentage / 100) * 0.35
            = base (0.6) + quality (0-0.35)

Example:
  success_pct = 95% → confidence = 0.6 + 0.3325 = 0.9325
  success_pct = 70% → confidence = 0.6 + 0.245 = 0.845
  success_pct = 50% → confidence = 0.6 + 0.175 = 0.775
```

---

### detectPerformanceDegradation(agentId, taskType = null)

**Purpose**: Identify when agent performance declines suddenly.

**Inputs**:
- agentId: TEXT
- taskType: TEXT (optional, specific task type or all)

**Process**:
```
1. Query last 10 feedback_results for agent
   ORDER BY created_at DESC
   
   IF < 7 feedbacks:
     Log "insufficient data", return null

2. Split data:
   recent_2 = first 2 (most recent)
   previous_5 = next 5

3. Calculate averages:
   recent_avg = avg(recent_2.success_percentage)
   previous_avg = avg(previous_5.success_percentage)

4. Calculate degradation:
   degradation_pct = ((previous - recent) / previous) * 100

5. Threshold check:
   IF degradation_pct > 15%:
     Create alert
     probable_cause = select based on degradation_pct:
       > 40%: "Possível esgotamento ou mudança de instrução"
       > 20%: "Degradação gradual"
       else: "Minor decline"

6. Save alert:
   Insert into performance_degradation with status='alert'
   Insert learning_event with event_type='issue_detected'

7. Log:
   "[phase5] ⚠️ ALERTA: {agentId} degradou {pct}% em {taskType}"

8. Return degradation object
```

**Degradation Threshold Rationale**:
- 15%+ is significant enough to warrant investigation
- Protects against normal variance (some tasks are harder)
- Acts as early warning system

---

### updateAgentSkills(agentId, skillName, taskType, wasSuccessful)

**Purpose**: Update agent's skill proficiency based on task outcome.

**Inputs**:
- agentId: TEXT
- skillName: TEXT — "copywriting", "design", "seo"
- taskType: TEXT — the context of skill use
- wasSuccessful: BOOLEAN — did task succeed

**Process**:
```
1. Query agent_skills for (agentId, skillName)

2. IF exists:
     newTimesUsed = existing.times_used + 1
     newSuccessCount = (existing.success_rate * existing.times_used) + (wasSuccessful ? 1 : 0)
     newSuccessRate = newSuccessCount / newTimesUsed
     
     proficiencyGain = wasSuccessful ? 0.02 : -0.01
     newProficiency = clamp(existing.proficiency + proficiencyGain, 0, 1.0)
     
     UPDATE agent_skills SET:
       proficiency_level = newProficiency
       times_used = newTimesUsed
       success_rate = newSuccessRate
       last_used_at = NOW()
       updated_at = NOW()

   ELSE:
     INSERT new agent_skills:
       proficiency_level = wasSuccessful ? 0.6 : 0.3
       times_used = 1
       success_rate = wasSuccessful ? 1.0 : 0.0
       last_used_at = NOW()

3. Log:
   IF new skill:
     "[phase5] ✨ Novo skill descoberto: \"{skillName}\""
   ELSE:
     "[phase5] 📈 Skill \"{skillName}\" atualizado: proficiency {new}, success_rate {rate}"

4. Return true on success
```

---

### generateRecommendations(agentId)

**Purpose**: Generate actionable recommendations for CMO.

**Inputs**:
- agentId: TEXT

**Process**:
```
1. Query agent_learning_patterns
   WHERE confidence > 0.7
   ORDER BY confidence DESC
   LIMIT 3

   → If found patterns indicating expertise:
     Recommend: "Increase {taskType} assignments"

2. Query performance_degradation
   WHERE status = 'alert'
   
   → If found:
     Recommend: "Investigate performance decline"

3. Query agent_skills
   WHERE proficiency_level > 0.7
   
   → If multiple high-proficiency skills:
     Recommend: "Pair with complementary agent"

4. For each recommendation:
   INSERT into ai_recommendations with:
     - title: concise title
     - description: detailed explanation
     - reasoning: why we recommend this
     - confidence: based on supporting data
     - potential_impact: "engagement +20%" or "time -15%"
     - status: 'pending'

5. Log:
   "[phase5] 💡 {count} recomendações geradas pra {agentId}"

6. Return list of recommendations
```

---

### getAgentLearningContext(agentId)

**Purpose**: Generate markdown briefing snippet with learning summary.

**Inputs**:
- agentId: TEXT

**Returns**: Markdown string with patterns, skills, recommendations

**Process**:
```
1. Query agent_learning_patterns
   WHERE confidence > 0.7
   → Section: "🎯 Padrões de Sucesso Descobertos"

2. Query agent_skills
   WHERE proficiency_level > 0.7
   → Section: "💪 Skills Desenvolvidos"

3. Query ai_recommendations
   WHERE status = 'pending'
   LIMIT 2
   → Section: "💡 Recomendações de Melhoria"

4. Build markdown:
   ```markdown
   ## 🎯 Padrões de Sucesso Descobertos
   - Pattern 1 (confidence: 90%)
   - Pattern 2 (confidence: 85%)
   
   ## 💪 Skills Desenvolvidos
   - **Skill 1**: proficiency 80% (85% success, 15 uses)
   - **Skill 2**: proficiency 65% (70% success, 8 uses)
   
   ## 💡 Recomendações de Melhoria
   - Rec 1: description
   - Rec 2: description
   ```

5. Return markdown string
```

---

## Integration Points

### In Bridge.tick()

```javascript
async function tick() {
  tickCount++;
  
  // ... existing polls ...
  
  // PHASE 5: Analyze learning (every 240 ticks ~2 hours)
  if (tickCount % 240 === 0) {
    await analyzeAgentLearning();  // calls discover, detect, generate
  }
}
```

### In createPaperclipIssue()

```javascript
async function createPaperclipIssue(calendar) {
  // ... existing code ...
  
  // PHASE 5: Inject learning context into briefing
  const learningContext = await buildLearningBriefing(CMO_AGENT_ID);
  if (learningContext) {
    briefing += '\n' + learningContext;
  }
}
```

### When Task Completes

```javascript
// In evaluateCompletedIssue() or similar:
await submitFeedbackResult(
  issueId,
  agentId,
  taskType,
  'engagement',  // metric
  expectedEngagement,
  actualEngagement,
  cmoFeedback
);
```

---

## Learning Feedback Loop

```
TIME: Task completes
├─ submitFeedbackResult(engagement data)
│
TIME: Later (< 1 hour if enough data)
├─ Bridge.tick() % 240 == 0
├─ analyzeAgentLearning()
│  ├─ discoverLearningPatterns() per agent
│  │  └─ Patterns saved with confidence
│  ├─ detectPerformanceDegradation() per agent
│  │  └─ Alerts created if > 15% drop
│  └─ generateRecommendations() per agent
│     └─ Recommendations marked pending
│
TIME: Next briefing
├─ createPaperclipIssue()
├─ buildLearningBriefing() injects learning context
│  └─ CMO sees patterns + skills + recommendations
└─ Briefing includes what to do based on historical learning

TIME: CMO accepts/rejects recommendations
├─ Status changes: pending → accepted/rejected
└─ System learns what CMO values
```

---

## Performance Characteristics

### Pattern Discovery Complexity
```
Time: O(n) where n = number of feedback records (max 10-20)
Space: O(1) per pattern

Example:
  - 15 feedbacks analyzed: ~100ms
  - 3 patterns discovered: ~50ms insert
  - Total: ~150ms per agent
  - All 5 agents: ~750ms every 2 hours
```

### Degradation Detection Complexity
```
Time: O(1) — exactly 10 lookups
Space: O(1)

Example:
  - Query 10 most recent: ~5ms
  - Calculate averages: < 1ms
  - Per agent: ~10ms
  - All agents: ~50ms
```

### Recommendation Generation Complexity
```
Time: O(n) where n = patterns + skills + degradations
Space: O(1)

Example:
  - Query patterns: ~10ms
  - Query skills: ~10ms
  - Query degradation: ~5ms
  - Generate recommendations: ~20ms
  - Per agent: ~45ms
  - All agents: ~225ms
```

### Total Phase 5 Analysis Time
```
Per cycle (every 2 hours):
  - Pattern discovery: 750ms
  - Degradation detection: 50ms
  - Recommendation generation: 225ms
  ─────────────────────────
  Total: ~1025ms (~1 second)

This runs asynchronously in tick(), doesn't block.
```

---

## Future Enhancements

### Phase 6: Emergent Behavior Recognition
```
- Track patterns that span multiple agents
- "Team is best at enterprise clients"
- "Copywriter + Designer pairs 1.5x better"
- Create team-level recommendations
```

### Phase 7: Self-Correction Loops
```
- Agent sees degradation alert
- Agent auto-investigates: "Why did quality drop?"
- Agent proposes corrective action
- CMO reviews and approves/rejects
```

### Phase 8: Skill-Based Task Matching
```
- Task arrives with requirements
- System auto-routes to agent with highest skill match
- If no agent qualified, auto-initiates training
```

---

Ready to test Phase 5? Check PHASE5_TESTING.md! 🚀
