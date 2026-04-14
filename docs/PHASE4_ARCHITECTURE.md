# Phase 4: Architecture — Consensus Voting & Task Decomposition

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 4: CONSENSUS VOTING                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bridge.tick() every 30s                                        │
│  ├─ collectAgentVotes() [every 100 ticks = ~50s]               │
│  │  ├─ Find pending decision_points                            │
│  │  └─ Simulate agents voting on decisions                      │
│  │                                                               │
│  └─ resolvePendingDecisions() [every 120 ticks = ~60s]         │
│     ├─ aggregateVotes()                                         │
│     │  ├─ Calculate weighted vote sum                           │
│     │  ├─ Find winning_choice                                   │
│     │  ├─ Calculate consensus_confidence                        │
│     │  └─ Detect is_tie                                         │
│     └─ Update decision_points.status                            │
│        ├─ "consensus_reached" if no tie                         │
│        └─ "tie" if is_tie = true                                │
│                                                                  │
│  + Task Decomposition (on demand)                               │
│    ├─ calculateTaskComplexity() → score 1-10                   │
│    ├─ If complexity > 6: decomposeComplexTask()                │
│    └─ Create subtasks with dependencies                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### decision_points
```
id: UUID (Primary Key)
issue_id: TEXT (links to Paperclip issue, e.g., "issue#456")
decision_type: TEXT 
  ∈ {format, strategy, priority, approach, timeline}
question: TEXT (e.g., "Qual formato maximiza engagement?")
context: JSONB (e.g., {client, budget, pillar, timeline})
required_voters: INT (minimum votes needed before resolving)
status: TEXT
  ∈ {voting, consensus_reached, tie, escalated}
created_at: TIMESTAMP
resolved_at: TIMESTAMP (when consensus reached or tie detected)

Indices:
  - decision_points(issue_id)
  - decision_points(status)
```

### agent_votes
```
id: UUID (Primary Key)
decision_id: UUID (FK → decision_points)
agent_id: TEXT (e.g., "copywriter_sondar")
choice: TEXT (the option voted for, e.g., "instagram_post")
confidence: FLOAT [0-1] (agent's confidence in this choice)
reasoning: TEXT (why agent chose this)
vote_weight: FLOAT (1.0 * agent_accuracy in decision_type)
created_at: TIMESTAMP

Indices:
  - agent_votes(decision_id)
  - agent_votes(agent_id, decision_id)
```

### vote_consensus
```
id: UUID (Primary Key)
decision_id: UUID (FK → decision_points, UNIQUE)
winning_choice: TEXT (the option that won)
total_votes: INT (how many agents voted)
winning_votes: INT (how many voted for winner)
consensus_confidence: FLOAT [0-1]
  = winning_weight_sum / total_weight_sum
all_votes: JSONB (e.g., {instagram_post: 1.75, carousel: 0.75})
is_tie: BOOLEAN
  = true if top 2 choices differ < 0.1 in weight
cmo_decision: TEXT (if tie, CMO's choice goes here)
created_at: TIMESTAMP

Indices:
  - vote_consensus(decision_id) UNIQUE
```

### task_decompositions
```
id: UUID (Primary Key)
parent_issue_id: TEXT (original complex task, e.g., "issue#999")
complexity_score: FLOAT [1-10]
decomposition_reason: TEXT
subtasks: JSONB
  = [
      {
        title: "Pesquisa e Briefing",
        priority: "high" | "medium" | "low",
        dependencies: ["parent", "specific-sibling"],
        assigned_to: "agent_id" (optional)
      },
      ...
    ]
strategy: JSONB
  = {
      approach: "description of strategy",
      phases: ["phase1", "phase2", ...],
      success_metrics: ["metric1", "metric2"]
    }
created_at: TIMESTAMP
executed_at: TIMESTAMP (when CMO approves to execute)

Indices:
  - task_decompositions(parent_issue_id)
```

### decision_history
```
id: UUID (Primary Key)
agent_id: TEXT
decision_type: TEXT ∈ {format, strategy, priority, approach, timeline}
correct_votes: INT (count of times agent's vote led to good outcome)
total_votes: INT (total votes cast by agent in this decision_type)
accuracy_score: FLOAT
  = correct_votes / total_votes
created_at: TIMESTAMP
updated_at: TIMESTAMP

Composite Index:
  - decision_history(agent_id, decision_type)

Semantics:
  For each agent, tracks how often they "got it right"
  when voting on format decisions vs strategy decisions, etc.
  
  Used for vote_weight calculation:
    vote_weight = agent.accuracy_score * vote.confidence
```

## Function Specifications

### createDecisionPoint(issueId, decisionType, question, context, requiredVoters)

**Purpose**: Create a decision that needs agent consensus.

**Inputs**:
- issueId: TEXT — links to Paperclip issue ID
- decisionType: TEXT — one of {format, strategy, priority, approach, timeline}
- question: TEXT — the decision being made
- context: JSONB (optional) — background info (client, budget, timeline, etc)
- requiredVoters: INT (default 3) — how many votes before resolving

**Process**:
```
1. Insert into decision_points with status='voting'
2. Log: "[phase4] 🗳️ Ponto de decisão criado: '{question}' ({decisionType})"
3. Return the created decision record (with id)
```

**Side Effects**:
- Creates row in decision_points table
- Triggers Bridge's collectAgentVotes loop to start collecting

**Error Handling**:
- Log error if insert fails
- Return null on failure

---

### recordAgentVote(decisionId, agentId, choice, confidence, reasoning)

**Purpose**: Register an agent's vote on a decision.

**Inputs**:
- decisionId: UUID — which decision
- agentId: TEXT — which agent
- choice: TEXT — what they're voting for
- confidence: FLOAT [0-1] — how confident (default 0.8)
- reasoning: TEXT (optional) — why they voted this way

**Process**:
```
1. Query decision_history for agent's accuracy in this decision_type
   IF exists:
     vote_weight = agent.accuracy_score * confidence
   ELSE:
     vote_weight = 1.0 * confidence

2. Insert into agent_votes with vote_weight

3. Log: "[phase4] ✅ Voto registrado: {agentId} votou \"{choice}\" (conf: {confidence})"

4. Return created vote record
```

**Vote Weight Formula**:
```
vote_weight = (agent_accuracy || 1.0) * vote_confidence

Example:
  agent has 60% accuracy in 'format' decisions
  agent is 85% confident in this vote
  → vote_weight = 0.6 * 0.85 = 0.51

  agent has no history (new agent)
  agent is 85% confident
  → vote_weight = 1.0 * 0.85 = 0.85 (full weight)
```

**Error Handling**:
- Log error if insert fails
- Return null on failure

---

### aggregateVotes(decisionId)

**Purpose**: Calculate consensus from votes on a decision.

**Inputs**:
- decisionId: UUID — which decision to aggregate

**Process**:
```
1. Query all agent_votes for this decision
   IF none:
     Log warning, return null

2. Build vote map:
   voteMap = {}
   for each vote:
     choice = vote.choice
     weight = vote.vote_weight * vote.confidence
     voteMap[choice] += weight

3. Sort choices by weight (descending)
   sorted = [{choice, weight}, ...]

4. Calculate consensus:
   winning_choice = sorted[0].choice
   winning_weight = sorted[0].weight
   total_weight = sum of all weights
   consensus_confidence = winning_weight / total_weight

5. Detect tie:
   is_tie = (total_votes.length > 1) AND (|sorted[0] - sorted[1]| < 0.1)

6. Build all_votes object:
   all_votes = {choice1: weight1, choice2: weight2, ...}

7. Insert into vote_consensus:
   {
     decision_id,
     winning_choice,
     total_votes: len(votes),
     winning_votes: round(winning_weight),
     consensus_confidence,
     all_votes,
     is_tie
   }

8. Log result:
   IF is_tie:
     "[phase4] ⚖️ Empate detectado! CMO precisa arbitrar"
   ELSE:
     "[phase4] 📊 Consenso alcançado: \"{choice}\" ({confidence%} confiança)"

9. Return consensus record
```

**Consensus Confidence Interpretation**:
- 0.90+ = Strong consensus (team mostly agrees)
- 0.75-0.89 = Good consensus (clear winner)
- 0.60-0.74 = Weak consensus (some disagreement)
- < 0.60 = No clear consensus (probably tie)

**Tie Detection Logic**:
```
is_tie = true if:
  - More than 1 unique choice
  - AND |weight(choice1) - weight(choice2)| < 0.1
  
Example:
  choice_a: 0.902 weight
  choice_b: 0.810 weight
  diff: 0.092 < 0.1 → is_tie = true
```

---

### decomposeComplexTask(parentIssueId, taskData)

**Purpose**: Break complex task into subtasks if complexity > 6.

**Inputs**:
- parentIssueId: TEXT — the issue containing the complex task
- taskData: OBJECT
  ```
  {
    type: "content_creation" | "design" | "strategy",
    title: TEXT,
    description: TEXT,
    timeline: INT (days),
    dependencies: [TEXT],
    client_segment: "enterprise" | "startup" | ... (optional),
    budget: FLOAT (optional)
  }
  ```

**Process**:
```
1. Calculate complexity score:
   score = 3  // baseline
   
   Complexity factors:
   IF description.length > 500: score += 1
   IF subtasks.length > 3: score += 1
   IF timeline < 3 days: score += 2
   IF dependencies.length > 0: score += 1
   IF client_segment == "enterprise": score += 1
   IF budget > 5000: score += 1
   
   score = min(10, score)

2. IF score <= 6:
     Log: "[phase4] Task complexity {score}/10, não precisa decomposição"
     Return null

3. IF score > 6:
     Generate subtasks based on taskData.type:
     
     IF type == "content_creation":
       subtasks = [
         {title: "Pesquisa e Briefing", priority: "high", dependencies: []},
         {title: "Rascunho/Outline", priority: "high", dependencies: ["research"]},
         {title: "Primeira Versão", priority: "high", dependencies: ["outline"]},
         {title: "Revisão Interna", priority: "medium", dependencies: ["draft"]},
         {title: "Otimizações Finais", priority: "medium", dependencies: ["review"]},
         {title: "Publicação", priority: "high", dependencies: ["final"]}
       ]
     
     ELSE IF type == "design":
       subtasks = [
         {title: "Moodboard & Referências", priority: "high", dependencies: []},
         {title: "Sketches/Wireframes", priority: "high", dependencies: ["mood"]},
         {title: "Design Final", priority: "high", dependencies: ["sketches"]},
         {title: "Revisão e Feedback", priority: "medium", dependencies: ["design"]},
         {title: "Ajustes Finais", priority: "medium", dependencies: ["feedback"]}
       ]
     
     ELSE IF type == "strategy":
       subtasks = [
         {title: "Análise Competitiva", priority: "high", dependencies: []},
         {title: "Definição de Objetivos", priority: "high", dependencies: ["analysis"]},
         {title: "Seleção de Tática", priority: "high", dependencies: ["goals"]},
         {title: "Calendário & Alocação", priority: "high", dependencies: ["calendar"]},
         {title: "Plano de Contingência", priority: "medium", dependencies: ["calendar"]}
       ]

4. Build strategy object:
   strategy = {
     approach: "Decomposição de tarefa complexa (score: {score}/10)",
     phases: [list of subtask titles],
     success_metrics: [
       "Todas as {N} subtarefas completadas no prazo",
       "Qualidade média >= 8/10 por agente",
       "Feedback positivo do cliente"
     ]
   }

5. Insert into task_decompositions:
   {
     parent_issue_id,
     complexity_score: score,
     decomposition_reason: "...",
     subtasks,
     strategy
   }

6. Log: "[phase4] 📋 Tarefa decomposta em {N} subtarefas (complexidade: {score}/10)"

7. Return decomposition record
```

**Complexity Scoring Rationale**:
- Simple task = score 1-3 (can be done linearly)
- Medium task = score 4-6 (may need some coordination)
- Complex task = score 7-10 (needs decomposition and planning)

---

### updateVotingAccuracy(agentId, decisionType, wasCorrect)

**Purpose**: Update agent's voting accuracy record after decision outcome known.

**Inputs**:
- agentId: TEXT
- decisionType: TEXT
- wasCorrect: BOOLEAN (true if agent's vote matched the winning choice)

**Process**:
```
1. Query decision_history for (agentId, decisionType)
   
   IF exists:
     new_correct = existing.correct_votes + (wasCorrect ? 1 : 0)
     new_total = existing.total_votes + 1
     new_accuracy = new_correct / new_total
     
     UPDATE decision_history
     SET correct_votes = new_correct,
         total_votes = new_total,
         accuracy_score = new_accuracy
     WHERE id = existing.id
   
   ELSE:
     INSERT into decision_history
     {
       agent_id,
       decision_type,
       correct_votes: wasCorrect ? 1 : 0,
       total_votes: 1,
       accuracy_score: wasCorrect ? 1.0 : 0.0
     }

2. Log: "[phase4] 📈 Acurácia de votação atualizada: {agentId} em {decisionType} = {accuracy%}"

3. Return true on success
```

**Accuracy Score Interpretation**:
- 0.8+ = High accuracy (agent's votes usually right)
- 0.5-0.79 = Medium accuracy
- < 0.5 = Low accuracy (agent's votes often wrong)

**Used For**:
- vote_weight calculation in future votes
- Identifying expert voters in specific domains
- Identifying which agents should recuse themselves

---

### getAgentVotingAccuracy(agentId, decisionType)

**Purpose**: Retrieve agent's voting history.

**Inputs**:
- agentId: TEXT
- decisionType: TEXT (optional, if null returns all)

**Returns**:
```
[
  {
    agent_id: "copywriter_sondar",
    decision_type: "format",
    correct_votes: 8,
    total_votes: 10,
    accuracy_score: 0.80
  },
  ...
]
```

---

## Integration Points

### In Bridge.tick()

```javascript
async function tick() {
  tickCount++;
  
  // ... other polls ...
  
  // PHASE 4: Collect votes from agents (every 100 ticks)
  if (tickCount % 100 === 0) {
    await collectAgentVotes();
  }
  
  // PHASE 4: Resolve decisions with consensus (every 120 ticks)
  if (tickCount % 120 === 0) {
    await resolvePendingDecisions();
  }
}
```

### Decision Point Creation

When a complex task arrives in createPaperclipIssue():

```javascript
async function createPaperclipIssue(calendar) {
  // ... existing code ...
  
  // PHASE 4: Check if task needs decomposition
  if (calendar.plan.task_data) {
    const decomposition = await decomposeComplexTask(
      issueId,
      calendar.plan.task_data
    );
    
    if (decomposition) {
      briefing += `\n## 📋 Tarefa Decomposta\n${JSON.stringify(decomposition.subtasks, null, 2)}`;
    }
  }
  
  // PHASE 4: Create decision point if ambiguous
  if (calendar.plan.needs_decision) {
    const decision = await createDecisionPoint(
      issueId,
      calendar.plan.decision_type,
      calendar.plan.decision_question,
      calendar.plan.context,
      3
    );
    
    briefing += `\n## 🗳️ Votação em Andamento\n${decision.question}`;
  }
}
```

---

## Voting Flow Diagram

```
TIME: t=0s
├─ createDecisionPoint("Qual formato?")
│  └─ decision_points: {status: voting, required_voters: 3}
│
TIME: t=50s (100 ticks)
├─ collectAgentVotes()
│  ├─ Query: decision_points WHERE status='voting'
│  ├─ For each decision:
│  │  ├─ recordAgentVote(agent1, choice_a, 0.85)
│  │  ├─ recordAgentVote(agent2, choice_a, 0.90)
│  │  └─ recordAgentVote(agent3, choice_b, 0.75)
│  └─ agent_votes table now has 3 votes
│
TIME: t=60s (120 ticks)
├─ resolvePendingDecisions()
│  ├─ Query: decision_points WHERE status='voting' AND created_at < 30min ago
│  ├─ For each decision:
│  │  ├─ aggregateVotes(decision_id)
│  │  │  ├─ Sum weights: choice_a=1.75, choice_b=0.75
│  │  │  ├─ winning_choice = choice_a
│  │  │  ├─ consensus_confidence = 1.75/2.5 = 70%
│  │  │  └─ Insert vote_consensus
│  │  └─ Update decision_points.status = 'consensus_reached'
│  └─ vote_consensus and decision_points updated
│
TIME: t=61s+
└─ CMO sees in briefing:
   "✅ Consenso alcançado: choice_a (70% confiança)"
```

---

## Tie Resolution Workflow

```
When is_tie = true:

1. resolvePendingDecisions() sets decision.status = 'tie'

2. CMO sees in admin dashboard:
   "⚖️ EMPATE: approach_a vs approach_b (ambos ~72%)"
   [Escolha approach_a] [Escolha approach_b]

3. CMO clicks one option

4. Admin endpoint calls:
   UPDATE vote_consensus
   SET cmo_decision = 'approach_a'
   WHERE decision_id = uuid
   
   UPDATE decision_points
   SET status = 'consensus_reached'
   WHERE id = uuid

5. Next briefing shows:
   "✅ CMO decidiu: approach_a (tie resolvido pelo CMO)"
```

---

## Performance Characteristics

### Vote Aggregation Complexity
```
Time: O(n) where n = number of votes
Space: O(n)

Example: 100 decisions, ~3 votes each
- Total rows: 300 votes
- Aggregation time: < 10ms per decision
- All 100 decisions: < 1s total
```

### Task Decomposition Complexity
```
Time: O(1) (fixed subtask generation based on type)
Space: O(1) (max 6 subtasks per task)

Example: 10 complex tasks decomposed
- Insertion: ~100ms
- Storage: ~1KB per decomposition
```

### Vote Weight Lookup
```
Time: O(1) single-row lookup per vote
Space: O(1)

Example: 300 votes needing weight lookup
- Decision history queries: ~300 * 1ms = 300ms
- Optimized with index on (agent_id, decision_type)
```

---

## Future Enhancements

### Phase 5: Self-Improving Voting
```
- Track which agents' votes lead to successful outcomes
- Auto-increase weight for high-accuracy voters
- Auto-decrease for low-accuracy voters
- Learn patterns: "copywriter is 85% accurate on format,
  but only 60% on strategy"
```

### Phase 6: Distributed Decision Making
```
- Agents automatically recuse themselves if low accuracy
- Different decision types routed to specialist agents
- Consensus threshold adjusts based on decision type importance
```

### Phase 7: Hierarchical Decisions
```
- Sub-decisions feed into parent decisions
- Conditional branching based on earlier decisions
- Multi-stage voting (round 1 → filter options → round 2)
```

---

## Testing Strategy

See PHASE4_TESTING.md for detailed test scenarios covering:
1. Basic decision point creation
2. Vote recording with confidence levels
3. Consensus aggregation
4. Tie detection
5. Task decomposition
6. Voting accuracy tracking
7. Bridge auto-collection and resolution

---

Ready to test Phase 4? Check PHASE4_TESTING.md! 🚀
