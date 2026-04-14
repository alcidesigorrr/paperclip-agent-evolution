# 🗳️ Phase 4: Consensus Voting & Task Decomposition

## TL;DR

Seu sistema agora:
1. **Cria pontos de decisão** para tarefas complexas/ambíguas
2. **Agentes votam** em opções baseado em expertise
3. **Sistema agrega votos** com pesos (confiança + histórico)
4. **Se houver consenso**: decisão é automatizada
5. **Se houver empate**: CMO arbitra
6. **Tarefas complexas decompostas**: em subtarefas com sequência

**Resultado**: Decisões complexas distribuídas entre agentes. CMO só intervém quando há desacordo. Tarefas grandes quebram automaticamente.

---

## Como Funciona

### Cenário 1: Votação em Formato de Post

```
CMO cria briefing:
  "Novo cliente enterprise. Post de case study ou carousel?"
    ↓
Bridge detecta complexidade > 6
    ↓
createDecisionPoint():
  - question: "Qual formato maximiza engagement?"
  - decisionType: 'format'
  - required_voters: 3
  - context: {client: "enterprise", budget: 15000, ...}
    ↓
Agentes votam:
  - copywriter_sondar: "instagram_post" (conf: 0.85, peso: 1.2)
  - designer_sondar: "instagram_post" (conf: 0.80, peso: 1.0)
  - content_creator: "instagram_carousel" (conf: 0.72, peso: 0.9)
    ↓
aggregateVotes():
  - instagram_post: 0.85*1.2 + 0.80*1.0 = 2.22 ✓ WINNER
  - instagram_carousel: 0.72*0.9 = 0.648
  - consensus: 2.22 / (2.22 + 0.648) = 77% confiança
    ↓
Decision resolvida:
  status = 'consensus_reached'
  winning_choice = 'instagram_post'
    ↓
CMO vê no briefing:
  "✅ Consensus: use instagram_post (77% confiança)"
```

### Cenário 2: Decisão com Empate

```
Dois agentes votam igualmente:
  - agent_a: "approach_aggressive" (conf: 0.82, peso: 1.1)
  - agent_b: "approach_conservative" (conf: 0.81, peso: 1.0)
    ↓
aggregate_votes():
  - approach_aggressive: 0.82 * 1.1 = 0.902
  - approach_conservative: 0.81 * 1.0 = 0.81
  - diferença < 0.1 → is_tie = true
    ↓
decision_points.status = 'tie'
    ↓
CMO vê:
  "⚖️ Empate detectado: 2 abordagens equally válidas
   Você decide: aggressive ou conservative?"
```

### Cenário 3: Task Decomposition

```
Briefing: "Criar estratégia de conteúdo trimestral"
  (descrição: 800 chars, prazo: 1 semana, dependências: 3)
    ↓
calculateTaskComplexity():
  - baseline: 3
  - descrição longa: +1 → 4
  - prazo apertado: +2 → 6
  - dependências: +1 → 7
  - tipo 'strategy': ideal pra decomposição
    ↓
decomposeComplexTask():
  Subtarefas criadas:
    1. Análise Competitiva (high)
    2. Definição de Objetivos (high) [depends: #1]
    3. Seleção de Tática (high) [depends: #2]
    4. Calendário & Alocação (high) [depends: #3]
    5. Plano de Contingência (medium) [depends: #4]
    ↓
task_decompositions salva:
  parent_issue_id: issue#123
  complexity_score: 7
  subtasks: [5 tarefas com sequência]
  strategy: {approach: "...", phases: [...], metrics: [...]}
    ↓
CMO vê:
  "📋 Tarefa decomposta em 5 etapas
   Ordem: Análise → Objetivos → Tática → Calendário → Contingência"
```

---

## O Que Muda no Código

### Novas Tabelas
```sql
decision_points:        -- pontos de decisão que precisam votação
  id, issue_id, question, decision_type, context, 
  required_voters, status, resolved_at

agent_votes:           -- votos individuais
  id, decision_id, agent_id, choice, confidence, reasoning, vote_weight

vote_consensus:        -- resultado agregado
  id, decision_id, winning_choice, total_votes, winning_votes,
  consensus_confidence, all_votes, is_tie, cmo_decision

task_decompositions:   -- tarefas quebradas em subtarefas
  id, parent_issue_id, complexity_score, subtasks (JSONB), strategy

decision_history:      -- acurácia de votação por agente
  agent_id, decision_type, correct_votes, total_votes, accuracy_score
```

### Novas Funções

```javascript
createDecisionPoint(issueId, type, question, context, requiredVoters)
  → Cria decision pra votação
  → status = 'voting'

recordAgentVote(decisionId, agentId, choice, confidence, reasoning)
  → Agente vota
  → vote_weight = agent's historical accuracy
  
aggregateVotes(decisionId)
  → Calcula votos ponderados
  → Retorna winning_choice + consensus_confidence
  → Detecta is_tie

decomposeComplexTask(parentIssueId, taskData)
  → Se complexity > 6, quebra em subtarefas
  → Gera execution strategy
  → Salva dependências

getAgentVotingAccuracy(agentId, decisionType)
  → Retorna histórico de votação
  
updateVotingAccuracy(agentId, decisionType, wasCorrect)
  → Atualiza acurácia depois que tarefa completa
  → Feed para vote_weight futuro
```

### Integração no Bridge

```javascript
// A cada 100 ticks (~50 segundos):
if (tickCount % 100 === 0) {
  await collectAgentVotes();  // busca decisões pendentes, agents votam
}

// A cada 120 ticks (~60 segundos):
if (tickCount % 120 === 0) {
  await resolvePendingDecisions();  // agrega votos, resolve
}
```

---

## Exemplos de Fluxo

### Exemplo 1: Decision Type = "strategy"
```
Decision:
  question: "Como abordar novo segmento de cliente?"
  decision_type: 'strategy'
  options: ['aggressive_growth', 'steady_growth', 'maintenance']

Agentes votam:
  copywriter: aggressive_growth (0.88, peso 1.1)
  designer: steady_growth (0.75, peso 0.9)
  content_creator: aggressive_growth (0.82, peso 1.0)

Agregação:
  aggressive_growth: 0.88*1.1 + 0.82*1.0 = 1.748 ← VENCE
  steady_growth: 0.75*0.9 = 0.675

Resultado:
  winning_choice: 'aggressive_growth'
  consensus_confidence: 1.748/(1.748+0.675) = 72%
  status: 'consensus_reached'
```

### Exemplo 2: Task Decomposition

```
Task:
  type: 'content_creation'
  title: 'Criar série de 20 posts sobre SPT para LinkedIn'
  complexity_score: 8

Subtarefas geradas:
  1. Pesquisa e Briefing
  2. Rascunho/Outline [depends: 1]
  3. Primeira Versão [depends: 2]
  4. Revisão Interna [depends: 3]
  5. Otimizações Finais [depends: 4]
  6. Publicação [depends: 5]

Strategy:
  approach: "Decomposição de tarefa complexa (score: 8/10)"
  phases: ["Pesquisa", "Outline", "Draft", "Review", "Final", "Publish"]
  success_metrics: [
    "6 subtarefas completadas no prazo",
    "Qualidade média >= 8/10",
    "Engagement >= 150 avg por post"
  ]
```

### Exemplo 3: Weighted Voting

```
Agentes com histórico:
  copywriter_sondar:    60% accuracy em format decisions (peso: 1.2)
  designer_sondar:      80% accuracy em format decisions (peso: 1.4)
  content_creator:      50% accuracy em format decisions (peso: 0.8)

Decision: "Qual formato pro novo post?"

Votos:
  copywriter:     instagram_post (0.85 * 1.2 = 1.02)
  designer:       instagram_post (0.90 * 1.4 = 1.26)
  content_creator: carousel (0.75 * 0.8 = 0.60)

Resultado:
  instagram_post: 1.02 + 1.26 = 2.28 ✓ VENCE
  carousel: 0.60
  designers e copywriters (high accuracy) alignados = mais confiança
```

---

## Admin Integration

CMO vê decisões pendentes na dashboard:

```
## 🗳️ Decisões Pendentes

Você tem 2 votações em andamento:

1. "Qual formato maximiza engagement?" (format)
   Status: Em votação (2/3 agentes votaram)
   Votos até agora:
   - instagram_post: 2 votos (77%)
   - carousel: 1 voto (23%)
   
2. "Como abordar cliente enterprise?" (strategy)
   Status: ⚖️ EMPATE
   Votos:
   - aggressive_growth: 72% (0.902)
   - conservative: 72% (0.81)
   [Decida] ou [Deixar para depois]
```

---

## Task Decomposition UI

CMO vê tarefas decompostas:

```
## 📋 Tarefa Decomposta

Tarefa: "Criar estratégia de conteúdo trimestral"
Complexidade: 8/10 (requer decomposição)

Subtarefas e sequência:
  1. 📊 Análise Competitiva (Priority: high)
     Assigned to: content_creator_sondar
     
  2. 🎯 Definição de Objetivos (Priority: high)
     Depends on: #1
     Assigned to: cmo_sondar
     
  3. 📌 Seleção de Tática (Priority: high)
     Depends on: #2
     Assigned to: strategist (if available)
     
  4. 📅 Calendário & Alocação (Priority: high)
     Depends on: #3
     Assigned to: social_media_manager
     
  5. 🛡️ Plano de Contingência (Priority: medium)
     Depends on: #4
     Assigned to: cmo_sondar
```

---

## Dados Salvos

### decision_points table:
```sql
SELECT * FROM decision_points WHERE status != 'consensus_reached';

id                    | question                        | decision_type | status
---------------------|--------------------------------|---------------|----------
uuid-111              | Qual formato do post?          | format        | voting
uuid-222              | Qual abordagem pro cliente?    | strategy      | tie
```

### agent_votes table:
```sql
SELECT * FROM agent_votes WHERE decision_id = 'uuid-111';

agent_id            | choice            | confidence | vote_weight
--------------------|-------------------|------------|------------
copywriter_sondar   | instagram_post    | 0.85       | 1.2
designer_sondar     | instagram_post    | 0.90       | 1.4
content_creator     | carousel          | 0.75       | 0.8
```

### vote_consensus table:
```sql
SELECT * FROM vote_consensus;

decision_id | winning_choice | consensus_confidence | is_tie | total_votes
------------|----------------|----------------------|--------|------------
uuid-111    | instagram_post | 0.77                 | false  | 3
uuid-222    | NULL           | NULL                 | true   | 2
```

### task_decompositions table:
```sql
SELECT parent_issue_id, complexity_score, subtasks->'length' 
FROM task_decompositions;

parent_issue_id | complexity_score | subtask_count
----------------|------------------|---------------
issue#456       | 8                | 6
issue#789       | 7                | 5
```

### decision_history table:
```sql
SELECT agent_id, decision_type, accuracy_score 
FROM decision_history;

agent_id           | decision_type | accuracy_score
------------------|---------------|---------------
copywriter_sondar  | format        | 0.80
designer_sondar    | format        | 0.85
content_creator    | strategy      | 0.65
```

---

## Comportamento Esperado

### Semana 1-2 (Building decisions)
- Bridge cria decision_points quando tarefas complexas aparecem
- Agentes votam conforme tasks chegam
- Sem muito histórico ainda (todos têm peso ~1.0)

### Semana 3+
```
Logs:
[phase4] 📥 Coletando votos para: "Qual formato?"
[phase4]   ✓ copywriter_sondar votou: instagram_post (conf: 0.85)
[phase4]   ✓ designer_sondar votou: instagram_post (conf: 0.90)
[phase4] ✅ Decisão resolvida: "Qual formato?" → instagram_post (77%)
```

### Quando há empate
```
Logs:
[phase4] ⚖️ Decisão "Qual abordagem?" precisa de arbitragem CMO

CMO vê na dashboard:
  "⚖️ EMPATE: aggressive_growth vs conservative (ambos 72%)"
  [Escolha aggressive] ou [Escolha conservative]
```

---

## Weighted Voting Algorithm

```
Para cada voto:
  weight = agent_historical_accuracy * vote_confidence
  
  (se agent nunca votou nessa categoria, usa weight = 1.0 * confidence)

Resultado final:
  total_for_choice = SUM(weight) para cada choice
  winning_choice = choice com maior total
  consensus_confidence = winning_total / (sum de todos totais)
  
  is_tie = true se top 2 choices diferem < 0.1
```

---

## Next Steps

### Phase 4B (Admin Integration):
1. Endpoint `/api/decisions` (GET pending, POST vote for CMO)
2. Dashboard UI para:
   - Listar votações em andamento
   - Ver votos individuais
   - Arbitrar empates (CMO choice)
3. Task decomposition UI mostrando subtarefas

### Phase 4C (Agent Routing):
1. Rotear subtarefas pra agentes apropriados
2. Tracking de completion de subtarefas
3. Agregação de resultado final (subtarefas todos completos)

### Depois:
- **Phase 5**: Self-Improving Evaluation (agentes learns from feedback loops)
- **Phase 6**: Dynamic Company Structure (agentes criam/dissolvem forks automaticamente)

---

Tá pronto? Vamo testar Phase 4! 🚀
