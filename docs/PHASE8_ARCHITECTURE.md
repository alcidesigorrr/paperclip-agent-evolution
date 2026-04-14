# Phase 8: Architecture — Cross-Team Learning

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│         PHASE 8: CROSS-TEAM LEARNING                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Times Compartilham Conhecimento:                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. discoverBestPractices(teamId)                     │ │
│  │    Extract padrões de time de alta performance      │ │
│  │    practice_name, success_rate, performance_lift    │ │
│  │                                                       │ │
│  │ 2. proposeKnowledgeTransfer()                       │ │
│  │    Propõe transferência pro time com low perf       │ │
│  │    source → target, practice, status=proposed       │ │
│  │                                                       │ │
│  │ 3. adoptPractice()                                  │ │
│  │    Target time começa teste (status=trial)          │ │
│  │    baseline_performance registrado                  │ │
│  │                                                       │ │
│  │ 4. measureAdoptionImpact()                          │ │
│  │    Mede: performance_delta, success_count           │ │
│  │    Treina adoption_confidence                       │ │
│  │                                                       │ │
│  │ 5. rebuildLearningNetworks()                       │ │
│  │    Cria conexões entre times que aprendem juntos    │ │
│  │    mutual_benefit_score                             │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  Bridge.tick() every 30s                                    │
│  ├─ discoverTeamBestPractices() [every 360 ticks = ~3h]   │
│  └─ transferTeamKnowledge() [every 420 ticks = ~3.5h]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### team_best_practices
```
id: UUID (Primary Key)
source_team_id: UUID (FK → agent_teams)
practice_type: TEXT ∈ {collaboration_pattern, task_decomposition, quality_assurance}
practice_name: TEXT
description: TEXT
key_steps: JSONB — [{step, description}, ...]
success_rate: FLOAT [0-1]
  = times_successful / times_applied
times_applied: INT (quantas vezes foi usada)
times_successful: INT (quantas vezes funcionou)
performance_lift: FLOAT
  = perf_after_practice - perf_baseline
  Range: [-1.0, +1.0]
applicable_to_types: TEXT[] — tipos de times que pode aplicar
required_skills: JSONB — {skill: min_proficiency}
complexity_level: INT [1-5]
  1 = simples (1 dia pra implementar)
  5 = complexo (2+ semanas)
discovered_at: TIMESTAMP

Índices:
  - team_best_practices(source_team_id)
  - team_best_practices(practice_type)
  - team_best_practices(success_rate DESC)
```

### team_knowledge_transfer
```
id: UUID (Primary Key)
source_team_id: UUID (FK → agent_teams)
target_team_id: UUID (FK → agent_teams)
practice_id: UUID (FK → team_best_practices)
transfer_type: TEXT ∈ {coaching_session, documentation, observation, joint_execution}
proposed_by: TEXT (agent_id que propôs)
proposed_at: TIMESTAMP
started_at: TIMESTAMP
completed_at: TIMESTAMP
transfer_status: TEXT ∈ {proposed, accepted, in_progress, completed, failed}
notes: TEXT

Índices:
  - team_knowledge_transfer(source_team_id)
  - team_knowledge_transfer(target_team_id)
  - team_knowledge_transfer(transfer_status)
```

### team_practice_adoption
```
id: UUID (Primary Key)
team_id: UUID (FK → agent_teams)
practice_id: UUID (FK → team_best_practices)
adoption_status: TEXT ∈ {experimental, trial, adopted, abandoned}
adaptation_made: TEXT — como foi customizada pro contexto local
baseline_performance: FLOAT — perf antes da adoção
current_performance: FLOAT — perf depois
performance_delta: FLOAT
  = current_performance - baseline_performance
  Range: [-1.0, +1.0]
cycles_tested: INT — quantas semanas/sprints
success_count: INT — vezes que funcionou bem
failure_count: INT
adoption_confidence: FLOAT [0-1]
  = success_count / cycles_tested
started_at: TIMESTAMP
last_measured_at: TIMESTAMP
abandoned_at: TIMESTAMP
abandonment_reason: TEXT

UNIQUE(team_id, practice_id)

Índices:
  - team_practice_adoption(team_id)
  - team_practice_adoption(adoption_status)
  - team_practice_adoption(adoption_confidence DESC)
```

### team_learning_impact
```
id: UUID (Primary Key)
source_team_id: UUID
target_team_id: UUID
practice_id: UUID (FK → team_best_practices)
measurement_period_days: INT
original_team_performance: FLOAT (source team's perf when discovered)
target_team_before: FLOAT (target perf before adoption)
target_team_after: FLOAT (target perf after trial)
performance_lift: FLOAT = target_team_after - target_team_before
knowledge_adoption_rate: FLOAT [0-1]
  = % do time que adotou a prática
team_satisfaction: FLOAT [1-5]
  1 = hated it, 5 = loved it
member_engagement_change: FLOAT
  = engagement_after - engagement_before
  Range: [-1.0, +1.0]
measured_at: TIMESTAMP

Índices:
  - team_learning_impact(source_team_id)
  - team_learning_impact(target_team_id)
```

### team_learning_networks
```
id: UUID (Primary Key)
team_a_id: UUID
team_b_id: UUID
collaboration_count: INT
  = quantas práticas foram compartilhadas
total_knowledge_transferred: INT
  = cumulative learning events
mutual_benefit_score: FLOAT [0-1]
  = (perf_lift_a + perf_lift_b) / 2
  Ambas aprenderam?
last_interaction_at: TIMESTAMP

UNIQUE(team_a_id, team_b_id)

Índices:
  - team_learning_networks(team_a_id)
  - team_learning_networks(team_b_id)
  - team_learning_networks(mutual_benefit_score DESC)
```

### team_learning_events (audit log)
```
id: UUID (Primary Key)
event_type: TEXT ∈ {practice_discovered, transfer_proposed, adoption_started, adoption_completed}
source_team_id: UUID
target_team_id: UUID
practice_id: UUID
agent_id: TEXT
details: JSONB
created_at: TIMESTAMP

Índices:
  - team_learning_events(event_type)
  - team_learning_events(created_at DESC)
```

---

## Function Specifications

### discoverBestPractices(teamId)

**Purpose**: Extrai padrões bem-sucedidos de team de alta performance.

**Inputs**:
- teamId: UUID

**Process**:
```
1. Validate team performance:
   SELECT performance_score FROM agent_teams WHERE id = teamId
   IF performance_score < 0.75:
     return null (time precisa de 75%+ pra ter best practice válida)

2. Analyze recent feedback:
   SELECT * FROM feedback_results
   WHERE agent_id IN (SELECT agent_id FROM agent_teams WHERE id = teamId)
   AND created_at > NOW() - 30 days
   LIMIT 50

3. Calculate success rate:
   successRate = COUNT(WHERE actual >= expected) / COUNT(*)

4. Extract practice characteristics:
   practice_type = infer_from_feedback("collaboration_pattern")
   key_steps = identify_repeating_patterns()

5. Insert into team_best_practices:
   {
     source_team_id: teamId,
     practice_type,
     practice_name: "Pattern from Team {id}",
     description,
     success_rate: successRate,
     times_applied: 1,
     times_successful: 1,
     performance_lift: teamPerformance - 0.65 (baseline),
     complexity_level: 2 (padrão médio)
   }

6. Log:
   "[phase8] 🎯 Best practice descoberta: {successRate}% success"

7. Return practice record
```

---

### proposeKnowledgeTransfer(sourceTeamId, targetTeamId, practiceId)

**Purpose**: Propõe transferência de conhecimento.

**Inputs**:
- sourceTeamId: UUID
- targetTeamId: UUID
- practiceId: UUID

**Process**:
```
1. Validate:
   - sourceTeamId exists and is_active
   - targetTeamId exists and is_active
   - practiceId exists
   - sourceTeamId != targetTeamId

2. Check if already transferring:
   SELECT COUNT(*) FROM team_knowledge_transfer
   WHERE source = sourceTeamId AND target = targetTeamId
   AND transfer_status IN ('proposed', 'in_progress')
   IF count > 0: return existing transfer

3. Insert into team_knowledge_transfer:
   {
     source_team_id: sourceTeamId,
     target_team_id: targetTeamId,
     practice_id: practiceId,
     transfer_type: 'coaching_session',
     proposed_by: 'system',
     proposed_at: NOW(),
     transfer_status: 'proposed'
   }

4. Log:
   "[phase8] 📚 Transferência proposta: {source} → {target}"

5. Return transfer record
```

---

### adoptPractice(teamId, practiceId)

**Purpose**: Time começa a testar prática.

**Inputs**:
- teamId: UUID
- practiceId: UUID

**Process**:
```
1. Validate:
   - teamId exists
   - practiceId exists
   - No duplicate adoption (UNIQUE constraint will catch)

2. Get team current performance:
   SELECT performance_score FROM agent_teams WHERE id = teamId

3. Insert into team_practice_adoption:
   {
     team_id: teamId,
     practice_id: practiceId,
     adoption_status: 'trial',
     baseline_performance: currentPerf,
     current_performance: currentPerf,
     adoption_confidence: 0.5 (experimental),
     cycles_tested: 0,
     started_at: NOW()
   }

4. Log:
   "[phase8] 🚀 Prática sendo testada: {teamId}"

5. Return adoption record
```

---

### measureAdoptionImpact(teamId, practiceId)

**Purpose**: Mede impacto da prática após teste.

**Inputs**:
- teamId: UUID
- practiceId: UUID

**Process**:
```
1. Query adoption:
   SELECT * FROM team_practice_adoption
   WHERE team_id = teamId AND practice_id = practiceId

2. Query current team performance:
   SELECT performance_score FROM agent_teams WHERE id = teamId

3. Calculate delta:
   performanceDelta = currentPerf - adoption.baseline_performance
   wasSuccessful = performanceDelta > 0.05 (5% improvement threshold)

4. Update adoption record:
   {
     current_performance: currentPerf,
     performance_delta: performanceDelta,
     cycles_tested: cycles_tested + 1,
     success_count: success_count + (wasSuccessful ? 1 : 0),
     adoption_confidence: min(1.0, 0.5 + (performanceDelta * 10)),
     last_measured_at: NOW()
   }

5. IF performanceDelta > 0.10 (10% improvement):
     adoption_status = 'adopted' (permanente)
   ELSE IF adoption_confidence < 0.3:
     adoption_status = 'abandoned'
     abandonment_reason = "Não gerou impacto esperado"

6. Update team_best_practices:
   times_applied++
   IF wasSuccessful:
     times_successful++
   success_rate = times_successful / times_applied

7. Log:
   "[phase8] 📈 Impacto: {delta}% (confidence: {conf})"

8. Return updated adoption record
```

---

## Integration Points

### In Bridge.tick()
```javascript
// A cada 360 ticks (~3 horas):
if (tickCount % 360 === 0) {
  await discoverTeamBestPractices();
}

// A cada 420 ticks (~3.5 horas):
if (tickCount % 420 === 0) {
  await transferTeamKnowledge();
}
```

---

## Performance Characteristics

### Best Practice Discovery
```
Time: O(n) where n = feedback records (50-100)
Space: O(1)

Per discovery: ~50ms
Per team: ~50ms
All teams: ~200ms (4 times)
```

### Knowledge Transfer Proposal
```
Time: O(1)
Space: O(1)

Per proposal: ~5ms
```

### Adoption Impact Measurement
```
Time: O(1)
Space: O(1)

Per measurement: ~10ms
All active adoptions: ~100ms
```

---

## Learning Flow

```
WEEK 1:
  ├─ Team A: 85% perf, patterns emerge
  └─ Team B: 50% perf, struggling

WEEK 2:
  ├─ discoverBestPractices() identifica Team A pattern
  └─ proposeKnowledgeTransfer() → Team B

WEEK 3:
  ├─ Team B adoptPractice() (trial status)
  └─ Begins implementation, baseline=50%

WEEK 4:
  ├─ measureAdoptionImpact() - performance: 57%
  ├─ Delta = +7%, wasSuccessful = true
  └─ adoption_confidence = 0.5 + (0.07 * 10) = 1.2 capped 1.0

WEEK 5:
  ├─ Team B continues, performance: 62%
  ├─ Delta = +12%, adoption_confidence = 0.8
  └─ Status could change to 'adopted' if delta > 10%

WEEK 6:
  ├─ team_learning_networks created
  ├─ mutual_benefit_score = (0 + 0.12) / 2 = 0.06
  └─ Team A → Team B learning network established

ONGOING:
  ├─ Pattern propagates to Team C, D, E
  └─ Organizationally, práticas bem-sucedidas se difundem
```

---

Ready to test Phase 8? Check PHASE8_TESTING.md! 🚀
