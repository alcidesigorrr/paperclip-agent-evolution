# Phase 7: Testing Guide — Team Decision Making

## Setup (5 min)

```bash
cd /Users/igoralcides/paperclip/bridge
supabase db push
node bridge.mjs
```

---

## Cenário 1: Criar Decisão (10 min)

```javascript
> const agent_evolution = require('./modules/agent-evolution.mjs');

> const decision = await agent_evolution.createTeamDecision(
    'team-1-uuid',
    'task_approach',
    'Como devemos abordar este case study?',
    {priority: 'high'},
    2
  );
> console.log(decision.id);

// Esperado: decision criada, status='voting'
```

Verificar:
```sql
SELECT * FROM team_decisions WHERE team_id = 'team-1-uuid';
-- status: voting, required_voters: 2
```

---

## Cenário 2: Registrar Votos (10 min)

```javascript
> const vote1 = await agent_evolution.recordTeamVote(
    decision.id,
    'copywriter_sondar',
    'yes',
    'Voto em abordagem profunda'
  );

> const vote2 = await agent_evolution.recordTeamVote(
    decision.id,
    'designer_sondar',
    'no',
    'Voto em abordagem rápida'
  );

// Esperado: 2 votos registrados com weights
```

Verificar:
```sql
SELECT agent_id, choice, vote_weight FROM team_votes 
WHERE decision_id = 'decision-uuid';

-- agent_id          | choice | vote_weight
-- copywriter_sondar | yes    | 0.8
-- designer_sondar   | no     | 0.6
```

---

## Cenário 3: Agregar Consenso (10 min)

```javascript
> const consensus = await agent_evolution.aggregateTeamVotes(decision.id);
> console.log(consensus);

// Esperado:
// {
//   consensus_choice: 'yes',
//   yes_score: 0.8,
//   no_score: 0.6,
//   is_unanimous: false,
//   is_deadlocked: false
// }
```

Verificar:
```sql
SELECT * FROM team_vote_consensus WHERE decision_id = 'decision-uuid';
-- consensus_choice: yes, yes_score: 0.8, no_score: 0.6
```

---

## Cenário 4: Empate → Leader Quebra (10 min)

```javascript
// Criar decisão com votos iguais
> const decision2 = await agent_evolution.createTeamDecision(
    'team-1-uuid',
    'task_approach',
    'Qual cor usar?',
    {},
    2
  );

> await agent_evolution.recordTeamVote(decision2.id, 'agent1', 'yes', 'Roxo');
> await agent_evolution.recordTeamVote(decision2.id, 'agent2', 'no', 'Verde');

> const consensus2 = await agent_evolution.aggregateTeamVotes(decision2.id);
> console.log(consensus2.is_deadlocked);
// true

> const broken = await agent_evolution.leaderBreaksTie(decision2.id, 'yes');
> console.log(broken.consensus_choice);
// 'yes'
```

Verificar:
```sql
SELECT is_deadlocked, leader_override_choice FROM team_vote_consensus
WHERE decision_id = 'decision2-uuid';
-- is_deadlocked: false, leader_override_choice: yes
```

---

## Cenário 5: Registrar Impacto (15 min)

```javascript
// Depois de executar a decisão, medir resultado
> const impact = await agent_evolution.recordDecisionOutcome(
    decision.id,
    'positive',  // resultado bom
    0.15,        // +15% performance lift
    'Abordagem profunda gerou melhor engajamento'
  );

// Esperado: impacto registrado, accuracy atualizado
```

Verificar:
```sql
SELECT * FROM team_decision_impact WHERE decision_id = 'decision-uuid';
-- actual_outcome: positive, outcome_metric: 0.15

SELECT voting_accuracy FROM team_decision_history
WHERE agent_id = 'copywriter_sondar' AND decision_type = 'task_approach';
-- accuracy aumentou (votou certo)
```

---

## Cenário 6: Votação com Expertise (20 min)

```javascript
// Agora copywriter_sondar tem 100% accuracy em task_approach
// Seu vote_weight deve ser 1.0 na próxima votação

> const decision3 = await agent_evolution.createTeamDecision(
    'team-1-uuid',
    'task_approach',
    'Próxima pergunta...',
    {},
    2
  );

> const vote = await agent_evolution.recordTeamVote(
    decision3.id,
    'copywriter_sondar',
    'yes',
    'Baseado em expertise'
  );

> console.log(vote.vote_weight);
// Esperado: ~1.0 (expert)
```

---

## Test Checklist

| Test | How to Verify |
|------|---------------|
| Create decision | decision.status = 'voting' |
| Record vote | team_votes entry created with weight |
| Aggregate votes | consensus_choice populated, deadlock detected |
| Leader breaks tie | leader_override_choice set |
| Record outcome | team_decision_impact created, accuracy updated |
| Vote weight evolution | expertise grows with correct votes |
| Expertise affects weight | expert's vote counts more next time |

---

Ready to test? Cenário 1 → 6! 🚀
