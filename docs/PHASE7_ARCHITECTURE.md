# Phase 7: Architecture — Team Decision Making

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│         PHASE 7: TEAM DECISION MAKING                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Times Votam Coletivamente:                                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. createTeamDecision() — qual pergunta?             │ │
│  │    status: voting, required_voters: N                │ │
│  │                                                       │ │
│  │ 2. recordTeamVote() — membro vota                    │ │
│  │    choice + confidence + reasoning                   │ │
│  │    vote_weight = expertise_historical               │ │
│  │                                                       │ │
│  │ 3. aggregateTeamVotes() — agregar votos             │ │
│  │    yes_score, no_score, total_weight                │ │
│  │    Detecta empate (< 10% diff = empate)             │ │
│  │                                                       │ │
│  │ 4. leaderBreaksTie() — se empate                    │ │
│  │    leader_override_choice = decisão final           │ │
│  │                                                       │ │
│  │ 5. recordDecisionOutcome() — mede impacto           │ │
│  │    actual_outcome + metric → treina accuracy        │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  Bridge.tick() every 30s                                    │
│  ├─ collectTeamVotes() [every 150 ticks = ~75s]           │
│  │  └─ recordTeamVote() pra cada membro                    │
│  └─ resolveTeamVotes() [every 180 ticks = ~90s]           │
│     └─ aggregateTeamVotes() pra cada decision             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### team_decisions
```
id: UUID (Primary Key)
team_id: UUID (FK → agent_teams)
decision_type: TEXT ∈ {task_approach, resource_allocation, member_assignment}
question: TEXT
context: JSONB
status: TEXT ∈ {pending, voting, resolved, deadlocked}
required_voters: INT
leader_breakable: BOOLEAN
created_at: TIMESTAMP
resolved_at: TIMESTAMP

Índices:
  - team_decisions(team_id)
  - team_decisions(status)
  - team_decisions(created_at DESC)
```

### team_votes
```
id: UUID (Primary Key)
decision_id: UUID (FK → team_decisions)
team_id: UUID
agent_id: TEXT
choice: TEXT — 'yes', 'no', 'abstain'
confidence: FLOAT [0-1] — agente's confiança no voto
reasoning: TEXT — por que votou assim
vote_weight: FLOAT — baseado em voting_accuracy histórica
submitted_at: TIMESTAMP

Índices:
  - team_votes(decision_id)
  - team_votes(agent_id)

Voting Weight Formula:
  vote_weight = agent_voting_accuracy[decision_type]
  Range: [0.3, 1.0]
  - 0.3: agente novo nesse tipo de decisão
  - 1.0: agente expert (100% accuracy histórica)
```

### team_vote_consensus
```
id: UUID (Primary Key)
decision_id: UUID (UNIQUE, FK → team_decisions)
team_id: UUID
consensus_choice: TEXT — 'yes', 'no', 'abstain'
yes_score: FLOAT — weighted yes votes
no_score: FLOAT — weighted no votes
abstain_score: FLOAT
total_weight: FLOAT — soma de todos vote_weights
is_unanimous: BOOLEAN — top choice > 90%
is_deadlocked: BOOLEAN — top 2 choices diff < 10%
leader_decision_needed: BOOLEAN
leader_override_choice: TEXT (if leader quebrou)
resolution_time_seconds: INT
resolved_at: TIMESTAMP

Índices:
  - team_vote_consensus(team_id)
  - team_vote_consensus(consensus_choice)

Aggregation Algorithm:
  1. Sum votes by choice, weighted by vote_weight
  2. Calculate percentages: yes% = yes_score / total_weight
  3. Detect deadlock:
     if abs(yes% - no%) < 0.10:
       is_deadlocked = true
     else:
       consensus_choice = 'yes' if yes% > 50% else 'no'
  4. Detect unanimity:
     if max(yes%, no%) > 0.90:
       is_unanimous = true
```

### team_decision_impact
```
id: UUID (Primary Key)
decision_id: UUID (FK → team_decisions)
team_id: UUID (FK → agent_teams)
consensus_choice: TEXT
actual_outcome: TEXT ∈ {positive, neutral, negative}
outcome_metric: FLOAT — variação (ex: +0.12)
outcome_explanation: TEXT
was_leader_override: BOOLEAN
feedback_quality: FLOAT [0-1] — clara a retroalimentação?
decision_importance: INT [1-10] — impacto potencial
measured_at: TIMESTAMP

Índices:
  - team_decision_impact(team_id)
  - team_decision_impact(decision_id)
```

### team_decision_history
```
id: UUID (Primary Key)
team_id: UUID (FK → agent_teams)
agent_id: TEXT
decision_type: TEXT
votes_correct: INT
votes_total: INT
voting_accuracy: FLOAT [0-1]
  = votes_correct / votes_total
expertise_level: FLOAT [0-1]
  = 0.5 + (voting_accuracy * 0.5)
last_decision_at: TIMESTAMP

UNIQUE(team_id, agent_id, decision_type)

Índices:
  - team_decision_history(team_id, agent_id)
  - team_decision_history(voting_accuracy DESC)

Update on Decision Outcome:
  IF actual_outcome == 'positive':
    votes_correct++
  votes_total++
  voting_accuracy = votes_correct / votes_total
  expertise_level = 0.5 + (voting_accuracy * 0.5)
```

### team_consensus_events (audit log)
```
id: UUID (Primary Key)
event_type: TEXT ∈ {decision_created, vote_recorded, consensus_reached, leader_override}
team_id: UUID
decision_id: UUID
agent_id: TEXT
details: JSONB
created_at: TIMESTAMP

Índices:
  - team_consensus_events(team_id)
  - team_consensus_events(event_type)
  - team_consensus_events(created_at DESC)
```

---

## Function Specifications

### createTeamDecision(teamId, decisionType, question, context, requiredVoters)

**Purpose**: Cria uma decisão para votação coletiva.

**Inputs**:
- teamId: UUID
- decisionType: TEXT ("task_approach", "resource_allocation", etc)
- question: TEXT ("Como devemos abordar este projeto?")
- context: JSONB (background da decisão)
- requiredVoters: INT (default 2)

**Process**:
```
1. Validate: teamId exists em agent_teams
   IF NOT: return error

2. Insert into team_decisions:
   {
     team_id: teamId,
     decision_type: decisionType,
     question,
     context,
     status: 'voting',
     required_voters: requiredVoters,
     leader_breakable: true,
     created_at: NOW()
   }

3. Log:
   "[phase7] 🗳️ Decisão criada: {decisionType} no team {teamId}"

4. Return decision record
```

---

### recordTeamVote(decisionId, agentId, choice, reasoning)

**Purpose**: Registra voto individual.

**Inputs**:
- decisionId: UUID
- agentId: TEXT
- choice: TEXT ("yes", "no", "abstain")
- reasoning: TEXT

**Process**:
```
1. Query decision:
   SELECT decision_type FROM team_decisions WHERE id = decisionId

2. Query agent expertise:
   SELECT voting_accuracy FROM team_decision_history
   WHERE agent_id = agentId AND decision_type = decision_type
   IF NOT found: voting_accuracy = 0.5

3. Calculate vote weight:
   vote_weight = voting_accuracy * 1.0  // range [0.3, 1.0]

4. Insert into team_votes:
   {
     decision_id: decisionId,
     team_id: team_id (from decision),
     agent_id: agentId,
     choice,
     confidence: 0.7 (default),
     reasoning,
     vote_weight,
     submitted_at: NOW()
   }

5. Log:
   "[phase7] 🗽 {agentId} votou '{choice}' (peso: {weight}%)"

6. Return vote record
```

---

### aggregateTeamVotes(decisionId)

**Purpose**: Agrega votos e detecta consenso/empate.

**Inputs**:
- decisionId: UUID

**Process**:
```
1. Query all votes:
   SELECT * FROM team_votes WHERE decision_id = decisionId

2. IF votes.length < required_voters:
   Log warning, return null

3. Calculate weighted scores:
   yesScore = sum(vote.vote_weight WHERE choice='yes')
   noScore = sum(vote.vote_weight WHERE choice='no')
   abstainScore = sum(vote.vote_weight WHERE choice='abstain')
   totalWeight = yesScore + noScore + abstainScore

4. Calculate percentages:
   yesPercent = yesScore / totalWeight
   noPercent = noScore / totalWeight

5. Detect deadlock:
   IF abs(yesPercent - noPercent) < 0.10:
     isDeadlocked = true
     consensus = null
     leaderDecisionNeeded = true
   ELSE:
     isDeadlocked = false
     consensus = yesPercent > 0.5 ? 'yes' : 'no'
     isUnanimous = max(yesPercent, noPercent) > 0.9

6. Insert into team_vote_consensus:
   {
     decision_id: decisionId,
     consensus_choice: consensus,
     yes_score: yesScore,
     no_score: noScore,
     abstain_score: abstainScore,
     total_weight: totalWeight,
     is_deadlocked: isDeadlocked,
     is_unanimous: isUnanimous,
     leader_decision_needed: leaderDecisionNeeded
   }

7. Log result:
   IF isDeadlocked:
     "[phase7] 🤔 Empate! Leader quebra (sim: {yes%}, não: {no%})"
   ELSE:
     "[phase7] ✅ Consenso: {consensus} ({topPercent}%)"

8. Return consensus record
```

---

### leaderBreaksTie(decisionId, leaderChoice)

**Purpose**: Leader quebra empate.

**Inputs**:
- decisionId: UUID
- leaderChoice: TEXT ("yes", "no")

**Process**:
```
1. Validate: decision is_deadlocked = true

2. Update team_vote_consensus:
   SET leader_override_choice = leaderChoice,
       consensus_choice = leaderChoice,
       is_deadlocked = false
   WHERE id = decisionId

3. Log:
   "[phase7] ⚖️ Leader quebrou empate: {leaderChoice}"

4. Return updated consensus
```

---

### recordDecisionOutcome(decisionId, outcome, outcomeMetric, explanation)

**Purpose**: Registra resultado e treina accuracy.

**Inputs**:
- decisionId: UUID
- outcome: TEXT ("positive", "neutral", "negative")
- outcomeMetric: FLOAT (ex: +0.15 performance gain)
- explanation: TEXT

**Process**:
```
1. Insert into team_decision_impact:
   {
     decision_id: decisionId,
     actual_outcome: outcome,
     outcome_metric: outcomeMetric,
     outcome_explanation: explanation
   }

2. Query all votes for this decision:
   SELECT agent_id FROM team_votes WHERE decision_id = decisionId

3. For each voter:
   wasCorrect = outcome == 'positive'
   UPDATE team_decision_history:
     votes_total++
     IF wasCorrect:
       votes_correct++
     voting_accuracy = votes_correct / votes_total
     expertise_level = 0.5 + (voting_accuracy * 0.5)

4. Log:
   "[phase7] 📊 Resultado: {outcome} (impacto: {metric})"

5. Return impact record
```

---

## Integration Points

### In Bridge.tick()
```javascript
// A cada 150 ticks (~75s):
if (tickCount % 150 === 0) {
  await collectTeamVotes();  // simula votos de membros
}

// A cada 180 ticks (~90s):
if (tickCount % 180 === 0) {
  await resolveTeamVotes();  // agrega votos, detecta empate
}
```

---

## Performance Characteristics

### Vote Recording
```
Time: O(1)
Space: O(1)

Per vote: ~5ms
10 votes: ~50ms
```

### Vote Aggregation
```
Time: O(n) where n = votes (2-5 typically)
Space: O(1)

Per aggregation: ~10ms
```

### Consensus Detection
```
Time: O(1) — operação algébrica
Space: O(1)

Per decision: ~2ms
```

---

## Vote Weight Evolution

```
Agent novo em "task_approach":
  voting_accuracy: 0.5 (baseline)
  vote_weight: 0.5

Após 2 decisões, ambas corretas:
  voting_accuracy: 1.0
  vote_weight: 1.0 (expert)

Após 5 decisões, 3 corretas, 2 erradas:
  voting_accuracy: 0.6
  vote_weight: 0.6

Vote weight na agregação:
  - Baixa expertise = voto conta menos
  - Alta expertise = voto conta mais
  - Emergência natural de líderes de pensamento
```

---

## Decision Deadlock Resolution

```
YES votes: 0.8 weight
NO votes: 0.75 weight
Difference: 5% < 10%
→ DEADLOCK

Opcões:
1. Leader quebra (leaderBreaksTie)
2. Mais discussão, nova votação
3. Escalação pra level superior (Phase 9)

Time não pode ficar indefinidamente em deadlock:
  - Requisito de timeout (ex: 1 hora max em voting)
  - Ou Leader quebra automaticamente
```

---

Ready to test Phase 7? Check PHASE7_TESTING.md! 🚀
