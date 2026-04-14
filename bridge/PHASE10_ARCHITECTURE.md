# Phase 10: Architecture — Adaptive Strategy Optimization

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│    PHASE 10: ADAPTIVE STRATEGY OPTIMIZATION                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Sistema Aprende Estratégias e Propaga:                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. discoverTeamStrategies(teamId)                    │ │
│  │    Extrai padrões de times de 75%+ perf              │ │
│  │    success_rate, times_applied, complexity_score     │ │
│  │                                                       │ │
│  │ 2. experimentWithStrategy(teamId, strategyId)       │ │
│  │    Testa estratégia em novo contexto                │ │
│  │    hypothesis, baseline_performance                  │ │
│  │                                                       │ │
│  │ 3. validateStrategyExperiment(experimentId)         │ │
│  │    Mede resultado, atualiza confidence              │ │
│  │    outcome, outcome_metric, status                  │ │
│  │                                                       │ │
│  │ 4. promoteStrategyToLibrary(strategyId)             │ │
│  │    Eleva para conhecimento organizacional           │ │
│  │    maturity_level: 'emerging' → 'validated'         │ │
│  │                                                       │ │
│  │ 5. recommendStrategiesByContext(teamId)             │ │
│  │    IA recomenda estratégias baseado em contexto     │ │
│  │    expected_performance_lift, confidence             │ │
│  │                                                       │ │
│  │ 6. analyzeStrategySynergies()                       │ │
│  │    Detecta quais estratégias combinam bem           │ │
│  │    synergy_score > 1.0 = multiplicativo             │ │
│  │                                                       │ │
│  │ 7. optimizeOrganizationStrategy()                   │ │
│  │    Atualiza saúde global, promove maduras          │ │
│  │    innovation_score, market_relevance               │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  Bridge.tick() every 30s                                    │
│  ├─ discoverOrganizationStrategies() [300 ticks = 2.5h]   │
│  ├─ experimentWithStrategies() [360 ticks = 3h]           │
│  ├─ analyzeStrategyHealth() [420 ticks = 3.5h]            │
│  ├─ runStrategyOptimization() [480 ticks = 4h]            │
│  └─ propagateWinningStrategies() [600 ticks = 5h]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### team_strategies
```
id: UUID (Primary Key)
team_id: UUID NOT NULL (FK → agent_teams)
strategy_name: TEXT NOT NULL
strategy_type: TEXT — 'collaboration', 'timing', 'task_decomposition', 'resource_allocation'
description: TEXT
implementation_steps: JSONB — [{step, description}, ...]
success_rate: FLOAT [0-1]
  = times_successful / times_applied
times_applied: INT — quantas vezes usada
times_successful: INT — quantas vezes funcionou
performance_impact: FLOAT — quanto melhora (0.05 = +5%)
complexity_score: INT [1-10] — 1=simples, 10=complexo
required_conditions: JSONB — {team_size: >3, experience: "intermediate"}
conflicts_with: TEXT[] — estratégias que conflitam
synergy_with: TEXT[] — estratégias que combinam bem
discovered_at: TIMESTAMP
last_validated_at: TIMESTAMP

Índices:
  - team_strategies(team_id)
  - team_strategies(success_rate DESC)
  - team_strategies(strategy_type)
```

### strategy_experiments
```
id: UUID (Primary Key)
team_id: UUID NOT NULL (FK → agent_teams)
strategy_id: UUID (FK → team_strategies)
experiment_type: TEXT — 'validation', 'improvement', 'combination', 'novel'
description: TEXT
baseline_performance: FLOAT
hypothesis: TEXT — "Se usar X, esperamos Y"
expected_outcome: TEXT
actual_outcome: TEXT
outcome_metric: FLOAT — variação (ex: +0.12)
duration_cycles: INT — quantos ciclos rodou
status: TEXT ∈ {'active', 'completed', 'failed', 'inconclusive'}
confidence: FLOAT [0-1] — quanto confiamos no resultado
started_at: TIMESTAMP
completed_at: TIMESTAMP

Índices:
  - strategy_experiments(team_id)
  - strategy_experiments(status)
  - strategy_experiments(completed_at)
```

### team_strategy_history
```
id: UUID (Primary Key)
team_id: UUID NOT NULL (FK → agent_teams)
strategy_id: UUID (FK → team_strategies)
adoption_date: TIMESTAMP
adoption_status: TEXT — 'active', 'archived', 'superseded'
usage_count: INT
success_count: INT
performance_before: FLOAT
performance_after: FLOAT
performance_delta: FLOAT
notes: TEXT

Índices:
  - team_strategy_history(team_id)
  - team_strategy_history(adoption_date DESC)
```

### organizational_strategy_library
```
id: UUID (Primary Key)
strategy_name: TEXT NOT NULL UNIQUE
strategy_type: TEXT
description: TEXT NOT NULL
source_team_id: UUID (FK → agent_teams) — qual time descobriu
discovery_date: TIMESTAMP
maturity_level: TEXT ∈ {'emerging', 'validated', 'proven', 'canonical'}
  emerging: descoberta recente, pouca validação
  validated: testada em 2-3 times, 60%+ sucesso
  proven: 70%+ sucesso em 3+ times
  canonical: >80% sucesso, amplamente adotada
global_success_rate: FLOAT [0-1]
adoption_count: INT — quantos times usam
total_performance_lift: FLOAT — lift cumulativo
tags: TEXT[] — #collaboration, #efficiency, #innovation
documentation: JSONB — {step_by_step, prerequisites, gotchas}
video_tutorial_url: TEXT
last_updated_at: TIMESTAMP

Índices:
  - org_strategy_library(maturity_level)
  - org_strategy_library(global_success_rate DESC)
  - org_strategy_library(strategy_type)
```

### strategy_combinations
```
id: UUID (Primary Key)
strategy_a_id: UUID NOT NULL (FK → team_strategies)
strategy_b_id: UUID NOT NULL (FK → team_strategies)
synergy_type: TEXT — 'multiplicative', 'complementary', 'sequential'
synergy_score: FLOAT [0-2.0]
  < 1.0: estratégias competem
  = 1.0: neutras
  > 1.0: sinergia (quanto maior, melhor combo)
combined_performance_lift: FLOAT
tested_count: INT
success_count: INT
tested_at: TIMESTAMP

UNIQUE(strategy_a_id, strategy_b_id)

Índices:
  - strategy_combinations(synergy_score DESC)
```

### strategy_recommendations
```
id: UUID (Primary Key)
team_id: UUID NOT NULL (FK → agent_teams)
strategy_id: UUID (FK → team_strategies)
recommendation_type: TEXT — 'adopt', 'experiment', 'avoid', 'combine'
reason: TEXT — por que recomendada
expected_performance_lift: FLOAT
confidence: FLOAT [0-1]
recommended_at: TIMESTAMP
action_taken: TEXT — 'adopted', 'rejected', 'ignored', 'pending'
action_taken_at: TIMESTAMP

Índices:
  - strategy_recommendations(team_id)
  - strategy_recommendations(recommendation_type)
```

### strategy_adaptations
```
id: UUID (Primary Key)
original_strategy_id: UUID NOT NULL (FK → team_strategies)
adapted_team_id: UUID NOT NULL (FK → agent_teams)
adaptation_description: TEXT
changes_made: JSONB — quais steps foram modificados
adaptation_success_rate: FLOAT
original_vs_adapted_delta: FLOAT — melhoria/piora vs original
approved_for_library: BOOLEAN
adapted_at: TIMESTAMP

Índices:
  - strategy_adaptations(adapted_team_id)
  - strategy_adaptations(original_strategy_id)
```

### strategy_health_metrics
```
id: UUID (Primary Key)
strategy_id: UUID NOT NULL (FK → team_strategies)
organization_wide_success_rate: FLOAT
teams_using: INT
avg_team_improvement: FLOAT
stale_days: INT — não validada há quantos dias
market_relevance: FLOAT [0-1] — ainda relevante?
innovation_score: FLOAT [0-1] — quão inovadora
last_measured_at: TIMESTAMP

UNIQUE(strategy_id)

Índices:
  - strategy_health_metrics(organization_wide_success_rate DESC)
```

### strategy_events (audit log)
```
id: UUID (Primary Key)
event_type: TEXT — 'discovered', 'adopted', 'adapted', 'deprecated', 'combined'
strategy_id: UUID
team_id: UUID
details: JSONB
created_at: TIMESTAMP

Índices:
  - strategy_events(event_type)
  - strategy_events(created_at DESC)
```

---

## Function Specifications

### discoverTeamStrategies(teamId)

**Purpose**: Extrai padrões bem-sucedidos de time de alta performance.

**Inputs**:
- teamId: UUID

**Process**:
```
1. Validate performance:
   SELECT performance_score FROM agent_teams WHERE id = teamId
   IF performance_score < 0.75:
     return null

2. Analyze recent decisions:
   SELECT * FROM team_decisions
   WHERE team_id = teamId AND created_at > NOW() - 30 days
   AND status = 'resolved'
   LIMIT 20

3. Identify patterns:
   Extract: strategy_type, implementation_steps, success_rate
   complexity_score = infer_from_decisions()

4. Insert into team_strategies:
   {
     team_id: teamId,
     strategy_name: "Pattern from {team_name}",
     success_rate: calculated,
     times_applied: 1,
     times_successful: 1,
     performance_impact: 0.05-0.2,
     complexity_score: 3 (padrão)
   }

5. Log:
   "[phase10] 🔍 Estratégia descoberta: {strategy_name} ({success_rate}%)"

6. Return strategy record
```

---

### experimentWithStrategy(teamId, strategyId, hypothesis)

**Purpose**: Testa estratégia em novo contexto.

**Inputs**:
- teamId: UUID
- strategyId: UUID
- hypothesis: TEXT

**Process**:
```
1. Query strategy:
   SELECT * FROM team_strategies WHERE id = strategyId

2. Get team baseline:
   SELECT performance_score FROM agent_teams WHERE id = teamId

3. Insert into strategy_experiments:
   {
     team_id: teamId,
     strategy_id: strategyId,
     experiment_type: 'validation',
     hypothesis: hypothesis,
     baseline_performance: current_perf,
     status: 'active',
     confidence: 0.5,
     started_at: NOW()
   }

4. Log:
   "[phase10] 🧪 Experimento iniciado: {strategy} em {team}"

5. Return experiment record
```

---

### validateStrategyExperiment(experimentId, outcome, metric)

**Purpose**: Valida resultado do experimento.

**Inputs**:
- experimentId: UUID
- outcome: TEXT ('positive', 'neutral', 'negative')
- metric: FLOAT (ex: +0.12)

**Process**:
```
1. Query experiment:
   SELECT * FROM strategy_experiments WHERE id = experimentId

2. Update experiment:
   {
     actual_outcome: outcome,
     outcome_metric: metric,
     status: 'completed',
     confidence: 0.5 + (metric * 2) (capped at 1.0),
     completed_at: NOW()
   }

3. Update strategy success_rate:
   IF outcome == 'positive':
     times_successful++
   times_applied++
   success_rate = times_successful / times_applied

4. Insert health metrics (se não existe):
   → strategy_health_metrics

5. Log:
   "[phase10] ✅ Experimento validado: {outcome} (métrica: {metric})"

6. Return updated experiment
```

---

### promoteStrategyToLibrary(strategyId)

**Purpose**: Eleva estratégia validada pra biblioteca organizacional.

**Inputs**:
- strategyId: UUID

**Process**:
```
1. Query strategy:
   SELECT * FROM team_strategies WHERE id = strategyId
   IF success_rate < 0.70:
     return error("Estratégia precisa 70%+ sucesso")

2. Check if already in library:
   SELECT id FROM organizational_strategy_library
   WHERE strategy_name = strategy.strategy_name
   IF exists: return existing

3. Insert into library:
   {
     strategy_name: strategy.strategy_name,
     strategy_type: strategy.strategy_type,
     source_team_id: strategy.team_id,
     maturity_level: 'validated',
     global_success_rate: strategy.success_rate,
     adoption_count: 1,
     tags: extract_tags_from_description()
   }

4. Log:
   "[phase10] 📚 Estratégia promovida: {name} (maturity: validated)"

5. Return library record
```

---

### recommendStrategiesByContext(teamId)

**Purpose**: Recomenda estratégias a time baseado em contexto.

**Inputs**:
- teamId: UUID

**Process**:
```
1. Get team context:
   SELECT performance_score, team_size, specialization
   FROM agent_teams WHERE id = teamId

2. Find applicable strategies:
   SELECT * FROM organizational_strategy_library
   WHERE global_success_rate >= 0.65
   AND complexity_score <= 5
   LIMIT 5

3. For each strategy, check:
   - required_conditions match?
   - expected_lift based on performance_gap

4. Create recommendations:
   FOR each applicable strategy:
     expected_lift = strategy.performance_impact * (0.8 - team.performance_score)
     INSERT strategy_recommendations:
     {
       team_id: teamId,
       strategy_id: strategy.id,
       recommendation_type: 'adopt',
       expected_performance_lift: expected_lift,
       confidence: 0.75 (default)
     }

5. Log:
   "[phase10] 💡 {N} recomendações para {team_name}"

6. Return {count, recommendations}
```

---

### analyzeStrategySynergies()

**Purpose**: Detecta combinações estratégicas que funcionam bem.

**Inputs**: None

**Process**:
```
1. Get all active strategies:
   SELECT id FROM team_strategies
   WHERE success_rate >= 0.65

2. For each pair (a, b):
   3. Check if combination exists:
      SELECT id FROM strategy_combinations
      WHERE (strategy_a_id = a AND strategy_b_id = b)
      OR (strategy_a_id = b AND strategy_b_id = a)
      IF exists: skip to next pair

   4. Calculate synergy:
      synergy_score = expected_combined_lift / individual_lifts
      IF synergy_score > 1.0: significativo

   5. Insert combination:
      {
        strategy_a_id: a,
        strategy_b_id: b,
        synergy_type: infer_type(a, b),
        synergy_score: synergy_score,
        tested_count: 0,
        success_count: 0
      }

3. Update strategy synergy_with lists:
   FOR each high-synergy pair:
     UPDATE team_strategies
     SET synergy_with = array_append(synergy_with, other_id)

4. Log:
   "[phase10] 🔗 {N} sinergias descobertas"

5. Return {synergiesFound, avgScore}
```

---

### optimizeOrganizationStrategy()

**Purpose**: Otimiza saúde organizacional de estratégias.

**Inputs**: None

**Process**:
```
1. Update health metrics:
   FOR each strategy in team_strategies:
     SELECT team count using this strategy
     SELECT avg performance_delta from team_strategy_history
     INSERT/UPDATE strategy_health_metrics

2. Promote validated → proven:
   UPDATE organizational_strategy_library
   WHERE maturity_level = 'validated'
   AND global_success_rate >= 0.80
   SET maturity_level = 'proven'

3. Deprecate stale strategies:
   UPDATE team_strategies
   SET status = 'deprecated'
   WHERE last_validated_at < NOW() - 90 days

4. Calculate innovation scores:
   FOR each strategy:
     innovation = (success_rate - baseline) / complexity
     UPDATE strategy_health_metrics
     SET innovation_score = innovation

5. Log:
   "[phase10] ⚙️  Otimização: {N} estratégias atualizadas"

6. Return {strategiesUpdated, promoted, deprecated}
```

---

## Integration Points

### In Bridge.tick()
```javascript
// A cada 300 ticks (~2.5 horas):
if (tickCount % 300 === 0) {
  await discoverOrganizationStrategies();
}

// A cada 360 ticks (~3 horas):
if (tickCount % 360 === 0) {
  await experimentWithStrategies();
}

// A cada 420 ticks (~3.5 horas):
if (tickCount % 420 === 0) {
  await analyzeStrategyHealth();
}

// A cada 480 ticks (~4 horas):
if (tickCount % 480 === 0) {
  await runStrategyOptimization();
}

// A cada 600 ticks (~5 horas):
if (tickCount % 600 === 0) {
  await propagateWinningStrategies();
}
```

---

## Performance Characteristics

### Discovery
```
Time: O(n) where n = decisions (20-50)
Space: O(1)

Per discovery: ~50ms
Per team: ~50ms
All teams: ~200ms
```

### Experimentation
```
Time: O(1)
Space: O(1)

Per experiment: ~5ms
```

### Validation
```
Time: O(1)
Space: O(1)

Per validation: ~10ms
All active: ~100ms
```

### Synergy Analysis
```
Time: O(n²) where n = strategies (5-20)
Space: O(n²)

Pairs to analyze: 10-200
Per pair: ~5ms
Total: ~100-1000ms
```

### Organization Optimization
```
Time: O(n) where n = all strategies
Space: O(1)

Per strategy: ~5ms
All strategies: ~100ms
```

---

Ready to test Phase 10? Check PHASE10_TESTING.md! 🚀
