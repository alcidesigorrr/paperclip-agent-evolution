# Phase 4: Testing Guide — Consensus Voting & Task Decomposition

## Setup (5 min)

Phase 4 tá integrada. Nenhum setup especial além de rodar a migration.

```bash
# 1. Rodar migration
cd /Users/igoralcides/paperclip/bridge
supabase db push
# ou: psql postgresql://... < migrations/20260415_consensus_voting.sql

# 2. Iniciar Bridge
node bridge.mjs
```

---

## Cenário 1: Criar Decision Point (10 min)

### Objetivo
Criar uma decisão que precisa de votação.

### Via código direto (sem admin UI ainda):
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> const dp = await agent_evolution.createDecisionPoint(
    'issue#456', 
    'format',
    'Qual formato maximiza engagement: post ou carousel?',
    { client: 'enterprise', budget: 15000, pillar: 'cases' },
    3
  );
> console.log(dp.id);  // copie este UUID
```

### Ou via SQL direto:
```sql
INSERT INTO decision_points (issue_id, decision_type, question, context, required_voters)
VALUES (
  'issue#456',
  'format',
  'Qual formato maximiza engagement: post ou carousel?',
  '{"client": "enterprise", "budget": 15000}'::jsonb,
  3
);

SELECT * FROM decision_points WHERE status = 'voting';
-- Esperado: 1 linha com status='voting'
```

### Verificar resultado
```sql
SELECT id, question, decision_type, status, required_voters 
FROM decision_points 
WHERE status = 'voting';

-- Esperado:
id        | question                           | decision_type | status  | required_voters
----------|------------------------------------|-----------     |---------|----------------
uuid-123  | Qual formato maximiza engagement? | format        | voting  | 3
```

### Logs esperados
```
[phase4] 🗳️ Ponto de decisão criado: "Qual formato maximiza engagement?" (format)
```

---

## Cenário 2: Registrar Votos (15 min)

### Pré-requisito
Decision point criado do Cenário 1. Copie o UUID.

### Registrar votos de agentes
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> const decisionId = 'uuid-123'; // do Cenário 1
> 
> await agent_evolution.recordAgentVote(
    decisionId,
    'copywriter_sondar',
    'instagram_post',
    0.85,
    'Posts simples têm mais engagement no case-driven audience'
  );

> await agent_evolution.recordAgentVote(
    decisionId,
    'designer_sondar',
    'instagram_post',
    0.90,
    'Post 1:1 é mais fácil pra composição visual'
  );

> await agent_evolution.recordAgentVote(
    decisionId,
    'content_creator_sondar',
    'instagram_carousel',
    0.75,
    'Carousel permite mais storytelling'
  );
```

### Ou via SQL:
```sql
INSERT INTO agent_votes (decision_id, agent_id, choice, confidence, reasoning, vote_weight)
VALUES
  ('uuid-123', 'copywriter_sondar', 'instagram_post', 0.85, 'Simpler engagement', 1.0),
  ('uuid-123', 'designer_sondar', 'instagram_post', 0.90, 'Better composition', 1.0),
  ('uuid-123', 'content_creator_sondar', 'instagram_carousel', 0.75, 'More storytelling', 1.0);

SELECT COUNT(*) FROM agent_votes WHERE decision_id = 'uuid-123';
-- Esperado: 3
```

### Verificar votos
```sql
SELECT agent_id, choice, confidence, vote_weight
FROM agent_votes
WHERE decision_id = 'uuid-123'
ORDER BY created_at;

-- Esperado:
agent_id                | choice            | confidence | vote_weight
------------------------|-------------------|------------|------------
copywriter_sondar       | instagram_post    | 0.85       | 1.0
designer_sondar         | instagram_post    | 0.90       | 1.0
content_creator_sondar  | instagram_carousel| 0.75       | 1.0
```

### Logs esperados
```
[phase4] ✅ Voto registrado: copywriter_sondar votou "instagram_post" (conf: 0.85)
[phase4] ✅ Voto registrado: designer_sondar votou "instagram_post" (conf: 0.90)
[phase4] ✅ Voto registrado: content_creator_sondar votou "instagram_carousel" (conf: 0.75)
```

---

## Cenário 3: Agregar Votos e Consenso (10 min)

### Pré-requisito
Votos registrados do Cenário 2.

### Agregar votos
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> const decisionId = 'uuid-123';
> const consensus = await agent_evolution.aggregateVotes(decisionId);
> console.log(consensus);

// Esperado:
{
  id: 'uuid-456',
  decision_id: 'uuid-123',
  winning_choice: 'instagram_post',
  total_votes: 3,
  winning_votes: 2,
  consensus_confidence: 0.77,  // (0.85 + 0.90) / (0.85 + 0.90 + 0.75)
  all_votes: {
    'instagram_post': 1.75,
    'instagram_carousel': 0.75
  },
  is_tie: false
}
```

### Verificar consenso
```sql
SELECT * FROM vote_consensus WHERE decision_id = 'uuid-123';

-- Esperado:
winning_choice     | total_votes | consensus_confidence | is_tie
-------------------|-------------|----------------------|-------
instagram_post     | 3           | 0.77                 | false
```

### Verificar decision_points atualizado
```sql
SELECT status FROM decision_points WHERE id = 'uuid-123';
-- Status deve permanecer 'voting' até resolvePendingDecisions() rodar
-- (ou até você chamar aggregateVotes que atualiza vote_consensus)
```

### Logs esperados
```
[phase4] 📊 Consenso alcançado: "instagram_post" (77% confiança)
```

---

## Cenário 4: Empate (15 min)

### Setup: Criar situação de empate
```sql
-- Nova decision
INSERT INTO decision_points (issue_id, decision_type, question, context, required_voters)
VALUES (
  'issue#789',
  'strategy',
  'Qual abordagem: aggressive ou conservative?',
  '{"client": "startup"}'::jsonb,
  2
) RETURNING id;
-- Copie este UUID → uuid-789

-- Votos com pesos muito próximos
INSERT INTO agent_votes (decision_id, agent_id, choice, confidence, vote_weight)
VALUES
  ('uuid-789', 'copywriter_sondar', 'aggressive_growth', 0.82, 1.1),
  ('uuid-789', 'designer_sondar', 'conservative_growth', 0.81, 1.0);
```

### Agregar votos
```javascript
> const consensus = await agent_evolution.aggregateVotes('uuid-789');
> console.log(consensus.is_tie, consensus.all_votes);
// Esperado: true, { aggressive_growth: 0.902, conservative_growth: 0.81 }
```

### Verificar resultado
```sql
SELECT winning_choice, is_tie, all_votes
FROM vote_consensus
WHERE decision_id = 'uuid-789';

-- Esperado:
winning_choice | is_tie | all_votes
---------------|--------|-------------------------------------------
aggressive...  | true   | {"aggressive_growth": 0.902, "conservative": 0.81}
```

### Verificar decision_points
```sql
SELECT status FROM decision_points WHERE id = 'uuid-789';
-- Após resolvePendingDecisions rodar: status = 'tie'
```

### Logs esperados
```
[phase4] ⚖️ Empate detectado! CMO precisa arbitrar
```

---

## Cenário 5: Task Decomposition (20 min)

### Setup: Criar tarefa complexa
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> const task = {
    type: 'content_creation',
    title: 'Criar série de posts sobre SPT',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam vel sagittis sapien. Mauris ac nunc vitae quam molestie vehicula. Phasellus cursus est a mauris dignissim, vel porttitor magna faucibus... [800+ chars]',
    timeline: 7,  // days
    dependencies: ['market_research', 'client_approval']
  };

> const decomp = await agent_evolution.decomposeComplexTask('issue#999', task);
> console.log(decomp.complexity_score, decomp.subtasks.length);
// Esperado: 8, 6
```

### Ou via SQL (inserir tarefa depois checar):
```sql
INSERT INTO task_decompositions 
(parent_issue_id, complexity_score, decomposition_reason, subtasks, strategy)
VALUES (
  'issue#999',
  8,
  'Tarefa complexa: 6 subtarefas necessárias',
  '[
    {"title": "Pesquisa e Briefing", "priority": "high"},
    {"title": "Rascunho/Outline", "priority": "high"},
    {"title": "Primeira Versão", "priority": "high"},
    {"title": "Revisão Interna", "priority": "medium"},
    {"title": "Otimizações Finais", "priority": "medium"},
    {"title": "Publicação", "priority": "high"}
  ]'::jsonb,
  '{"approach": "phased", "phases": 6, "metrics": ["quality >= 8/10"]}'::jsonb
);

SELECT * FROM task_decompositions WHERE parent_issue_id = 'issue#999';
```

### Verificar resultado
```sql
SELECT complexity_score, subtasks->>'length', strategy->'phases'
FROM task_decompositions
WHERE parent_issue_id = 'issue#999';

-- Esperado:
complexity_score | subtask_count | phases
-----------------|---------------|-------
8                | 6             | 6
```

### Logs esperados
```
[phase4] 📋 Tarefa decomposta em 6 subtarefas (complexidade: 8/10)
```

---

## Cenário 6: Voting Accuracy Tracking (15 min)

### Setup: Registrar votos de um agente
```javascript
> const decisionId1 = 'uuid-decision-1';
> const decisionId2 = 'uuid-decision-2';

// Decision 1: Agent vota em 'approach_a'
> await agent_evolution.recordAgentVote(decisionId1, 'copywriter_sondar', 'approach_a', 0.85);

// Decision 2: Agent vota em 'approach_b'
> await agent_evolution.recordAgentVote(decisionId2, 'copywriter_sondar', 'approach_b', 0.80);
```

### Simular que decision 1 foi correta, decision 2 foi errada
```javascript
> // Decision 1 foi acertado (consenso foi 'approach_a')
> await agent_evolution.updateVotingAccuracy(
    'copywriter_sondar',
    'format',
    true  // foi correto
  );

> // Decision 2 foi errado (consenso foi 'approach_a', agente votou 'approach_b')
> await agent_evolution.updateVotingAccuracy(
    'copywriter_sondar',
    'format',
    false  // foi errado
  );
```

### Verificar histórico
```sql
SELECT agent_id, decision_type, correct_votes, total_votes, accuracy_score
FROM decision_history
WHERE agent_id = 'copywriter_sondar';

-- Esperado:
agent_id          | decision_type | correct_votes | total_votes | accuracy_score
------------------|---------------|---------------|-------------|---------------
copywriter_sondar | format        | 1             | 2           | 0.5
```

### Próximo voto deve ter peso baseado em accuracy
```javascript
> const history = await agent_evolution.getAgentVotingAccuracy('copywriter_sondar', 'format');
> console.log(history);  // accuracy_score: 0.5, isso deve dar peso 0.5 no próximo voto
```

### Logs esperados
```
[phase4] 📈 Acurácia de votação atualizada: copywriter_sondar em format = 50%
```

---

## Cenário 7: Bridge Auto-Collection (30 min)

### Objetivo
Deixar Bridge rodar naturalmente e ver votações serem coletadas e resolvidas.

### Setup: Criar múltiplas decisions
```sql
INSERT INTO decision_points (issue_id, decision_type, question, required_voters)
VALUES
  ('issue#a', 'format', 'Qual formato pra este post?', 3),
  ('issue#b', 'strategy', 'Qual abordagem pro Q2?', 3),
  ('issue#c', 'priority', 'Qual prioridade: high ou medium?', 2);
```

### Deixar Bridge rodar (ou force tick)
```
Bridge vai:
  - Cada 100 ticks: collectAgentVotes() → agents votam nas decisions pendentes
  - Cada 120 ticks: resolvePendingDecisions() → agrega votos, resolve
```

### Observar logs
```
[phase4] 📥 Coletando votos para: "Qual formato pra este post?"
[phase4]   ✓ copywriter_sondar votou: instagram_post (conf: 0.82)
[phase4]   ✓ designer_sondar votou: instagram_post (conf: 0.88)
[phase4]   ✓ content_creator_sondar votou: carousel (conf: 0.70)

[phase4] ✅ Decisão resolvida: "Qual formato?" → instagram_post (79%)
```

### Verificar estado final
```sql
SELECT status, COUNT(*) FROM decision_points GROUP BY status;

-- Esperado (após 1-2 min):
status              | count
--------------------|-------
consensus_reached   | 2
tie                 | 1
voting              | 0  -- todas foram processadas
```

---

## Debugging: Por que votação não funciona?

### Checklist

```
1. ✅ Decision point foi criada?
   SELECT COUNT(*) FROM decision_points WHERE status = 'voting';
   Deve ter >= 1

2. ✅ Agentes votaram?
   SELECT COUNT(*) FROM agent_votes;
   Deve ter >= 3

3. ✅ Consenso foi calculado?
   SELECT * FROM vote_consensus;
   Deve ter >= 1 linha

4. ✅ Bridge rodou collectAgentVotes()?
   Procurar por [phase4] 📥 nos logs
   
5. ✅ Bridge rodou aggregateVotes()?
   Procurar por [phase4] 📊 ou [phase4] ⚖️ nos logs
   
6. ✅ Task foi decomposta?
   SELECT COUNT(*) FROM task_decompositions;
   Se task complexity > 6, deve ter entrada

7. ✅ Votes têm vote_weight correto?
   SELECT agent_id, vote_weight FROM agent_votes;
   Deve refletir historical accuracy (ou 1.0 se novo)
```

---

## Performance Monitoring

### Query Times
```sql
-- Deve ser rápido (<100ms)
EXPLAIN ANALYZE
SELECT decision_id, COUNT(*) as vote_count, AVG(confidence) as avg_confidence
FROM agent_votes
GROUP BY decision_id;

-- Decomposition lookup deve ser rápido (<50ms)
EXPLAIN ANALYZE
SELECT * FROM task_decompositions 
WHERE parent_issue_id LIKE 'issue%'
ORDER BY created_at DESC;
```

### Logs to Monitor
```
[phase4] 🗳️ Ponto de decisão criado
  → New decision point created
  
[phase4] ✅ Voto registrado
  → Agent voted successfully
  
[phase4] 📥 Coletando votos para
  → Bridge collecting votes from agents
  
[phase4] 📊 Consenso alcançado
  → Consensus found, decision resolved
  
[phase4] ⚖️ Empate detectado
  → Tie found, needs CMO arbitration
  
[phase4] 📋 Tarefa decomposta
  → Complex task decomposed
  
[phase4] 📈 Acurácia de votação atualizada
  → Voting accuracy updated for agent
  
[phase4-err] Erro ao...
  → Error occurred
```

---

## Test Checklist

| Test | ✓ | How to Verify |
|------|---|---------------|
| Create decision point | | Decision appears in decision_points table |
| Register agent vote | | Vote appears in agent_votes table |
| Aggregate votes (consensus) | | Consensus appears in vote_consensus, is_tie=false |
| Detect tie | | Consensus has is_tie=true when votes tied |
| Decompose complex task | | Task appears in task_decompositions |
| Voting accuracy tracked | | decision_history updated with correct_votes/total_votes |
| Bridge collects votes | | Logs show [phase4] ✅ Voto registrado multiple times |
| Bridge resolves decisions | | decision_points status changes to consensus_reached/tie |
| Weighted voting works | | Agents with higher accuracy have higher vote_weight |
| Task complexity calculated | | complexity_score reflects task attributes |

---

## Next Steps

After validating Phase 4:

1. ✅ Implement admin UI
   - /api/decisions endpoint (GET, POST vote for CMO arbitration)
   - Dashboard form: [Approve aggressive] [Approve conservative]
   
2. ✅ Implement task routing
   - Break down subtasks from decompositions
   - Assign each subtask to appropriate agent
   - Track completion
   
3. ✅ Integrate with briefings
   - Include voting results in next briefing
   - Show decomposed tasks in task list
   
4. 🔜 Phase 5: Self-Improving Evaluation
   - Track which agents' votes led to success
   - Auto-increase weight for high-accuracy voters
   - Auto-decrease for low-accuracy voters

---

Ready to test? Start with Cenário 1 and work through! 🚀
