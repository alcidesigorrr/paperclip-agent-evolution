# 🗳️ Phase 7: Team Decision Making — Times Votam Juntos

## TL;DR

Seu sistema agora:
1. **Cria decisões de time** que precisam de votação coletiva
2. **Membros votam** com confiança e raciocínio
3. **Agrega votos** com peso baseado em expertise
4. **Líder quebra empate** se necessário
5. **Mede impacto** da decisão na performance
6. **Treina expertise em votação** pra próximas decisões

**Resultado**: Times tomam decisões coletivas. Consenso emerge naturalmente. Leader é arbitro em empates. Expertise de votação evolui.

---

## Como Funciona

### Cenário 1: Criar Decisão de Time

```
Novo trabalho chega pro time copywriter_designer_team:
  "Como devemos abordar este case study?"
  
createTeamDecision():
  - Cria record em team_decisions
  - status: 'voting'
  - required_voters: 2
  - question: "Abordagem: profundo vs rápido?"
    ↓
Time criado:
  - team_decisions.question: salvo
  - team_decisions.status: 'voting'
  - team_decisions.created_at: NOW()
    ↓
CMO vê no briefing:
  "🗳️ Time copywriter_designer precisa votar:
   Abordagem: profundo vs rápido?"
```

### Cenário 2: Membros Votam

```
Membros do time votam:
  copywriter_sondar: "Voto em PROFUNDO (conf: 0.85)"
    - expertise em decisões de conteúdo: 0.8
    - vote_weight = 0.8 (histórico)
  
  designer_sondar: "Voto em RÁPIDO (conf: 0.7)"
    - expertise em decisões de design: 0.6
    - vote_weight = 0.6
    ↓
recordTeamVote():
  - vote_weight baseado em expertise histórica
  - confidence from membro
  - reasoning: explicação da votação
    ↓
Votos registrados:
  - team_votes.agent_id: 'copywriter_sondar'
  - team_votes.choice: 'profundo'
  - team_votes.vote_weight: 0.8
```

### Cenário 3: Agregar Consenso

```
2+ votos coletados:
  Voto A: profundo (weight: 0.8)
  Voto B: rápido (weight: 0.6)
  
  yes_score = 0.8 (profundo)
  no_score = 0.6 (rápido)
  total_weight = 1.4
    ↓
aggregateTeamVotes():
  yes_percent = 0.8 / 1.4 = 57%
  no_percent = 0.6 / 1.4 = 43%
  
  Diferença = 14% > 10%
  → Não é empate
  → Consenso: PROFUNDO
    ↓
team_vote_consensus criado:
  - consensus_choice: 'profundo'
  - yes_score: 0.8
  - no_score: 0.6
  - is_unanimous: false
  - leader_decision_needed: false
    ↓
CMO vê:
  "✅ Consenso: PROFUNDO (57% vs 43%)"
```

### Cenário 4: Empate → Leader Quebra

```
2 votos iguais:
  Voto A: abordagem_x (weight: 0.75)
  Voto B: abordagem_y (weight: 0.72)
  
  Diferença = 3% < 10%
  → EMPATE
    ↓
aggregateTeamVotes():
  is_deadlocked: true
  leader_decision_needed: true
    ↓
leaderBreaksTie():
  copywriter_sondar (leader) escolhe: abordagem_x
  leader_override_choice: 'abordagem_x'
  consensus_choice: 'abordagem_x'
    ↓
CMO vê:
  "⚖️ Empate quebrado por leader (copywriter_sondar)
   Escolhido: abordagem_x"
```

### Cenário 5: Medir Impacto

```
2 semanas depois:
  Projeto usando abordagem PROFUNDO
  Resultado: engagement 35% melhor do esperado
    ↓
recordDecisionOutcome():
  actual_outcome: 'positive'
  outcome_metric: +0.35
  outcome_explanation: "Profundidade gerou trust, engagement↑"
    ↓
updateTeamVotingAccuracy():
  - copywriter_sondar votou PROFUNDO ✓
    votes_correct++
    voting_accuracy = 100% (nesse tipo)
  - designer_sondar votou RÁPIDO ✗
    votes_total++
    voting_accuracy = 50%
    ↓
Próxima votação:
  - copywriter_sondar: weight = 1.0 (expert)
  - designer_sondar: weight = 0.5 (aprendendo)
  
CMO vê:
  "📊 Resultado: +35% engagement
   copywriter_sondar: 100% accuracy em decisões de conteúdo
   designer_sondar: aprendendo, 50% accuracy"
```

---

## O Que Muda

### Novas Tabelas
```sql
team_decisions:              -- decisões esperando votação
  team_id, decision_type, question, status

team_votes:                  -- votos individuais
  decision_id, agent_id, choice, confidence, vote_weight

team_vote_consensus:         -- resultado agregado
  decision_id, consensus_choice, yes_score, no_score, is_deadlocked

team_decision_impact:        -- impacto da decisão
  decision_id, actual_outcome, outcome_metric

team_decision_history:       -- expertise em votação
  team_id, agent_id, decision_type, voting_accuracy

team_consensus_events:       -- auditoria
  event_type, team_id, decision_id
```

### Novas Funções
```javascript
createTeamDecision(teamId, decisionType, question, context)
  → Cria votação pro time

recordTeamVote(decisionId, agentId, choice, reasoning)
  → Registra voto individual

aggregateTeamVotes(decisionId)
  → Agrega votos, detecta empate

leaderBreaksTie(decisionId, leaderChoice)
  → Leader quebra empate

recordDecisionOutcome(decisionId, outcome, metric, explanation)
  → Mede impacto, treina accuracy
```

---

## Dados

### team_decisions table
```sql
team_id           | question                | status   | required_voters
------------------|------------------------|----------|----------------
team-1            | Abordagem?             | voting   | 2
team-2            | Prioridade?            | resolved | 2
```

### team_votes table
```sql
decision_id | agent_id          | choice   | vote_weight | confidence
------------|-------------------|----------|-------------|----------
d1          | copywriter_sondar | profundo | 0.8         | 0.85
d1          | designer_sondar   | rápido   | 0.6         | 0.7
```

### team_vote_consensus table
```sql
decision_id | consensus_choice | yes_score | no_score | is_unanimous | is_deadlocked
------------|------------------|-----------|----------|--------------|---------------
d1          | profundo         | 0.8       | 0.6      | false        | false
d2          | opcao_a          | NULL      | NULL     | false        | true
```

### team_decision_history table
```sql
team_id | agent_id          | decision_type | voting_accuracy | expertise_level
--------|-------------------|---------------|-----------------|----------------
t1      | copywriter_sondar | content       | 0.85            | 0.9
t1      | designer_sondar   | strategy      | 0.55            | 0.6
```

---

## Bridge Integration

```javascript
// A cada 150 ticks (~75s):
if (tickCount % 150 === 0) {
  await collectTeamVotes();
}

// A cada 180 ticks (~90s):
if (tickCount % 180 === 0) {
  await resolveTeamVotes();
}

collectTeamVotes():
  ├─ Busca team_decisions WHERE status='voting'
  ├─ Simula votos de membros
  └─ Registra com weight baseado em expertise

resolveTeamVotes():
  ├─ Agrega votos
  ├─ Detecta empate
  └─ Log resultado
```

---

## Next Steps

### Phase 7B (Dashboard):
1. UI pra votações em andamento
   - Mostrar pergunta da decisão
   - Placar de votos em tempo real
   - % de concordância

2. Histórico de decisões
   - Decisões tomadas vs resultados
   - Accuracy de voting por agente

---

Tá pronto? Vamo testar Phase 7! 🚀
