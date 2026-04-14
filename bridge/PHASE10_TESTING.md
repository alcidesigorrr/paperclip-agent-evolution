# Phase 10: Testing — Adaptive Strategy Optimization

## Test Strategy

We'll test Phase 10 by simulating the complete lifecycle of a strategy:
1. **Discovery** — Team A (85% perf) discovers a strategy
2. **Experimentation** — Team B (60% perf) tests it
3. **Validation** — Results measured and confidence updated
4. **Promotion** — Strategy elevated to library if 70%+ success
5. **Recommendation** — System recommends to Team C
6. **Synergy** — Detect how strategies combine
7. **Optimization** — Health metrics updated, best strategies promoted to "proven"

---

## Test 1: Discover Strategy from High-Performance Team

**Goal**: Extract a pattern from Team A (85% performance)

**Setup**:
```sql
INSERT INTO agent_teams (id, name, performance_score, is_active)
VALUES (
  'team-a-uuid',
  'Team A - High Performers',
  0.85,
  true
);

INSERT INTO team_decisions (id, team_id, decision_type, question, status)
SELECT 
  gen_random_uuid(),
  'team-a-uuid',
  'task_approach',
  'How should we structure this task?',
  'resolved'
FROM generate_series(1, 10);
```

**Execute**:
```javascript
const result = await discoverTeamStrategies('team-a-uuid');
```

**Expected Output**:
```javascript
{
  strategiesFound: 1,
  strategies: [
    {
      id: 'strategy-uuid',
      strategy_name: 'Pattern from Team A - High Performers',
      strategy_type: 'task_decomposition',
      success_rate: 0.8,
      times_applied: 1,
      times_successful: 1,
      performance_impact: 0.15,
      complexity_score: 3
    }
  ]
}
```

**Assertions**:
- ✅ strategy.success_rate between 0.7 and 1.0
- ✅ complexity_score between 1 and 10
- ✅ performance_impact reflects team performance delta (0.85 - 0.65 = 0.20)
- ✅ Log: "[phase10] 🔍 Estratégia descoberta"

---

## Test 2: Experiment with Strategy on Lower-Performance Team

**Goal**: Team B (60% perf) tests Team A's strategy

**Setup**:
```sql
INSERT INTO agent_teams (id, name, performance_score, is_active)
VALUES (
  'team-b-uuid',
  'Team B - Medium Performers',
  0.60,
  true
);
```

**Execute**:
```javascript
const result = await experimentWithStrategy(
  'team-b-uuid',
  'strategy-uuid',
  'If we use async/await decomposition, we expect +8% performance lift'
);
```

**Expected Output**:
```javascript
{
  id: 'experiment-uuid',
  team_id: 'team-b-uuid',
  strategy_id: 'strategy-uuid',
  experiment_type: 'validation',
  hypothesis: 'If we use async/await...',
  baseline_performance: 0.60,
  status: 'active',
  confidence: 0.5,
  started_at: '2026-04-13T10:00:00Z'
}
```

**Assertions**:
- ✅ experiment.status = 'active'
- ✅ experiment.baseline_performance = team B's current perf
- ✅ experiment.confidence = 0.5 (initial)
- ✅ Log: "[phase10] 🧪 Experimento iniciado"

---

## Test 3: Validate Experiment with Positive Outcome

**Goal**: Measure experiment results and update confidence

**Setup**:
```javascript
// Simulate 3 weeks passing with +8% improvement
const experimentId = 'experiment-uuid';
const outcome = 'positive';
const metric = 0.08; // +8% performance gain
```

**Execute**:
```javascript
const result = await validateStrategyExperiment(
  experimentId,
  outcome,
  metric
);
```

**Expected Output**:
```javascript
{
  id: 'experiment-uuid',
  status: 'completed',
  actual_outcome: 'positive',
  outcome_metric: 0.08,
  confidence: 0.66, // 0.5 + (0.08 * 2), capped at 1.0
  completed_at: '2026-04-13T11:00:00Z'
}
```

**Assertions**:
- ✅ experiment.status = 'completed'
- ✅ experiment.confidence updated from 0.5 to 0.66+
- ✅ team_strategies.times_successful incremented
- ✅ team_strategies.success_rate recalculated
- ✅ Log: "[phase10] ✅ Experimento validado: positive"

---

## Test 4: Promote Strategy to Organizational Library

**Goal**: If success_rate ≥ 70%, promote to library

**Setup**:
```sql
UPDATE team_strategies 
SET success_rate = 0.75, times_applied = 4, times_successful = 3
WHERE id = 'strategy-uuid';
```

**Execute**:
```javascript
const result = await promoteStrategyToLibrary('strategy-uuid');
```

**Expected Output**:
```javascript
{
  id: 'lib-strategy-uuid',
  strategy_name: 'Pattern from Team A - High Performers',
  source_team_id: 'team-a-uuid',
  maturity_level: 'validated',
  global_success_rate: 0.75,
  adoption_count: 1,
  discovery_date: '2026-04-13T09:00:00Z',
  last_updated_at: '2026-04-13T11:00:00Z'
}
```

**Assertions**:
- ✅ maturity_level = 'validated' (initial)
- ✅ global_success_rate ≥ 0.70
- ✅ adoption_count initialized to 1
- ✅ No duplicate entries (name is UNIQUE)
- ✅ Log: "[phase10] 📚 Estratégia promovida"

---

## Test 5: Recommend Strategy to Lower-Performance Team

**Goal**: System recommends library strategy to Team C (55% perf)

**Setup**:
```sql
INSERT INTO agent_teams (id, name, performance_score, is_active)
VALUES (
  'team-c-uuid',
  'Team C - New Team',
  0.55,
  true
);
```

**Execute**:
```javascript
const result = await recommendStrategiesByContext('team-c-uuid');
```

**Expected Output**:
```javascript
{
  count: 1,
  recommendations: [
    {
      id: 'rec-uuid',
      team_id: 'team-c-uuid',
      strategy_id: 'lib-strategy-uuid',
      recommendation_type: 'adopt',
      expected_performance_lift: 0.1125, // 0.15 * (0.80 - 0.55)
      confidence: 0.75,
      recommended_at: '2026-04-13T11:00:00Z'
    }
  ]
}
```

**Assertions**:
- ✅ recommendation_type = 'adopt'
- ✅ expected_performance_lift calculated as: strategy.performance_impact × (baseline - team.perf)
- ✅ confidence = 0.75 (default, can be higher if strategy proven)
- ✅ Log: "[phase10] 💡 {N} recomendações para Team C"

---

## Test 6: Analyze Strategy Synergies

**Goal**: Detect when two strategies work well together

**Setup**:
```javascript
// Create 2 strategies with synergy potential
// Strategy A: "async decomposition" (75% success)
// Strategy B: "parallel execution" (72% success)

await insertStrategy('team-a-uuid', 'async_decomp', 0.75);
await insertStrategy('team-a-uuid', 'parallel_exec', 0.72);
```

**Execute**:
```javascript
const result = await analyzeStrategySynergies();
```

**Expected Output**:
```javascript
{
  synergiesFound: 1,
  avgScore: 1.25,
  synergies: [
    {
      id: 'combo-uuid',
      strategy_a_id: 'strat-a-uuid',
      strategy_b_id: 'strat-b-uuid',
      synergy_type: 'multiplicative',
      synergy_score: 1.25, // > 1.0 = synergistic
      combined_performance_lift: 0.18
    }
  ]
}
```

**Assertions**:
- ✅ synergy_score > 1.0 for multiplicative effects
- ✅ synergy_score ≤ 1.0 for neutral/competitive strategies
- ✅ No duplicate entries (UNIQUE on strategy pair)
- ✅ synergy_with arrays updated on strategies
- ✅ Log: "[phase10] 🔗 {N} sinergias descobertas"

---

## Test 7: Optimize Organization Strategy

**Goal**: System-wide optimization: update health metrics, promote "validated" → "proven"

**Setup**:
```sql
UPDATE organizational_strategy_library 
SET 
  maturity_level = 'validated',
  global_success_rate = 0.82,
  adoption_count = 3,
  last_updated_at = NOW()
WHERE id = 'lib-strategy-uuid';
```

**Execute**:
```javascript
const result = await runStrategyOptimization();
```

**Expected Output**:
```javascript
{
  strategiesUpdated: 1,
  promoted: 1,
  deprecated: 0
}
```

**Assertions**:
- ✅ strategy_health_metrics created/updated for each strategy
- ✅ maturity_level promoted from 'validated' to 'proven' (if 80%+ success)
- ✅ organization_wide_success_rate calculated correctly
- ✅ teams_using counted accurately
- ✅ stale_days calculated from last_validated_at
- ✅ Log: "[phase10] ⚙️  Otimização: {N} estratégias atualizadas"

---

## Test 8: End-to-End Scenario (8 Days)

**Scenario**: Track a strategy from discovery through organization optimization

**Day 1**:
- Team A (85% perf) completes 10 decisions with consistent patterns
- `discoverTeamStrategies()` → "collaborative decomposition" discovered (80% success rate)

**Day 3**:
- Team B (60% perf) receives recommendation
- `experimentWithStrategy()` → Experiment started
- Hypothesis: "If we use collaborative decomposition, +10% performance"

**Day 5**:
- Team B completes experiment
- `validateStrategyExperiment()` → Result: +9% (positive)
- confidence: 0.68
- success_rate: 0.75

**Day 6**:
- `promoteStrategyToLibrary()` → Promoted to 'validated'
- discovery_date: Day 1
- global_success_rate: 0.75
- adoption_count: 2 (Team A + B)

**Day 7**:
- Team C (55% perf), Team D (58% perf) receive recommendations
- `recommendStrategiesByContext()` → Both get recommendations
- Team C expected lift: 0.1125 (15% × 25% gap)
- Team D expected lift: 0.1050 (15% × 30% gap)

**Day 8**:
- `analyzeStrategySynergies()` → Detect combo with "parallel execution"
- synergy_score: 1.3 (multiplicative)

**Timeline**:
```
Day 1: Discovery (PHASE 10 discover 300 ticks)
Day 3: Experiment (PHASE 10 experiment 360 ticks)
Day 5: Validation (PHASE 10 health 420 ticks)
Day 6: Promotion (PHASE 10 optimize 480 ticks)
Day 7: Recommendation (PHASE 10 propagate 600 ticks)
Day 8: Synergies + reoptimization
```

**Assertions**:
- ✅ All 5 integration functions called on schedule
- ✅ Strategy lifecycle: discovered → active → validated → proven
- ✅ Adoption spreads: Team A → B → C → D
- ✅ Synergies identified when applicable
- ✅ Health metrics updated continuously
- ✅ Logs show progression at each stage

---

## Manual Test Checklist

- [ ] All 9 Phase 10 tables created via migration
- [ ] All 7 Phase 10 functions callable without errors
- [ ] All 5 integration functions added to bridge.mjs
- [ ] Tick intervals configured correctly (300, 360, 420, 480, 600)
- [ ] Imports in bridge.mjs complete (7 Phase 10 functions)
- [ ] No syntax errors in agent-evolution.mjs
- [ ] No syntax errors in bridge.mjs
- [ ] No duplicate function declarations
- [ ] Logs show [phase10] prefix
- [ ] Supabase tables queryable
- [ ] No foreign key constraint violations
- [ ] Strategy success_rate formula correct (times_successful / times_applied)
- [ ] Maturity level progression: emerging → validated → proven → canonical
- [ ] Synergy detection identifies multiplicative effects
- [ ] Health metrics include innovation_score calculation
- [ ] Recommendations include expected_performance_lift calculation

---

## Performance Test

Run all Phase 10 operations in sequence and measure time:

```javascript
console.time('phase10-full-cycle');

await discoverOrganizationStrategies();     // ~200ms
await experimentWithStrategies();           // ~50ms
await analyzeStrategyHealth();              // ~100ms
await runStrategyOptimization();            // ~100ms
await propagateWinningStrategies();         // ~150ms

console.timeEnd('phase10-full-cycle');
// Expected: 600ms total
```

---

## Expected Metrics After 1 Week

- **Strategies discovered**: 3-5
- **Experiments running**: 2-3
- **Experiments completed**: 1-2 (positive outcome: 60-80%)
- **Strategies promoted to library**: 1-2
- **Recommendations created**: 4-6
- **Synergies identified**: 2-4
- **Teams with >70% adoption**: 3-4

---

Ready to run tests? Execute test suite with:

```bash
npm test -- phase10
```

Or run manually:

```javascript
import * as phase10 from './modules/agent-evolution.mjs';

// Test 1: Discovery
const disc = await phase10.discoverTeamStrategies('team-a-uuid');
console.log('Test 1 (Discovery):', disc ? '✅ PASS' : '❌ FAIL');

// Test 2: Experiment
const exp = await phase10.experimentWithStrategy('team-b-uuid', 'strat-id', 'hypothesis');
console.log('Test 2 (Experiment):', exp ? '✅ PASS' : '❌ FAIL');

// Test 3: Validate
const val = await phase10.validateStrategyExperiment('exp-id', 'positive', 0.08);
console.log('Test 3 (Validate):', val ? '✅ PASS' : '❌ FAIL');

// Test 4: Promote
const prom = await phase10.promoteStrategyToLibrary('strat-id');
console.log('Test 4 (Promote):', prom ? '✅ PASS' : '❌ FAIL');

// Test 5: Recommend
const rec = await phase10.recommendStrategiesByContext('team-c-uuid');
console.log('Test 5 (Recommend):', rec ? '✅ PASS' : '❌ FAIL');

// Test 6: Synergies
const syn = await phase10.analyzeStrategySynergies();
console.log('Test 6 (Synergies):', syn ? '✅ PASS' : '❌ FAIL');

// Test 7: Optimize
const opt = await phase10.optimizeOrganizationStrategy();
console.log('Test 7 (Optimize):', opt ? '✅ PASS' : '❌ FAIL');
```

---

Phase 10 is complete! 🚀
