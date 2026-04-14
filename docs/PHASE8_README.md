# 🧠 Phase 8: Cross-Team Learning — Times Compartilham Conhecimento

## TL;DR

Seu sistema agora:
1. **Descobre best practices** em times de alta performance
2. **Extrai padrões bem-sucedidos** (colaboração, QA, etc)
3. **Propõe transferência** de knowledge pra outros times
4. **Mede adoção** da prática no novo contexto
5. **Treina impacto** de aprendizagem coletiva
6. **Cria networks de aprendizado** entre times

**Resultado**: Conhecimento flui entre times. Padrões bem-sucedidos se propagam. Organização aprende coletivamente.

---

## Como Funciona

### Cenário 1: Descobrir Best Practice

```
Time copywriter_designer_team:
  - Performance: 89% (excelente)
  - Últimas 4 semanas: padrão consistente
  
discoverBestPractices():
  1. Verificar: performance > 75%? ✓
  2. Analisar feedback dos últimos 30 dias
     - Taxa de sucesso: 89%
     - Padrão: colaboração próxima + iteração rápida
  3. Extrair best practice
     ↓
Prática descoberta:
  - practice_name: "High Synergy Collaboration"
  - description: "Padrão de colaboração do time que gera 89% success"
  - success_rate: 0.89
  - performance_lift: +0.24 (vs baseline 0.65)
  - complexity_level: 2 (implementável)
    ↓
team_best_practices criada:
  - source_team_id: copywriter_designer_team
  - times_applied: 1
  - times_successful: 1
```

### Cenário 2: Propor Transferência

```
Prática bem-sucedida identificada:
  "High Synergy Collaboration" de copywriter_designer_team
  
Outro time com baixa performance:
  strategy_team: 55% (precisa melhorar)
    ↓
proposeKnowledgeTransfer():
  source: copywriter_designer_team
  target: strategy_team
  practice: "High Synergy Collaboration"
  transfer_type: "coaching_session"
  status: "proposed"
    ↓
Transfer proposta:
  - team_knowledge_transfer criada
  - Strategy_team recebe proposta
  - Status: "proposed" esperando aceitação
    ↓
CMO vê:
  "📚 Best practice proposta:
   copywriter_designer → strategy_team
   Prática: High Synergy Collaboration
   Success rate esperada: +24%"
```

### Cenário 3: Adotar Prática

```
strategy_team aceita proposta:
  "Vamos tentar High Synergy Collaboration"
    ↓
adoptPractice():
  team_id: strategy_team
  practice_id: collaboration_practice
  adoption_status: 'trial'
  baseline_performance: 0.55
  
  team_practice_adoption criada:
    - team_id: strategy_team
    - practice_id: collaboration_practice
    - adoption_confidence: 0.5 (experimental)
    ↓
Adoção iniciada:
  - Time treinado no padrão
  - Status: 'trial' (observando resultados)
  - Próximas 2 semanas: validação
    ↓
CMO vê:
  "🚀 Adoção iniciada: strategy_team testando High Synergy
   Baseline: 55% → esperado 79%"
```

### Cenário 4: Medir Impacto

```
2 semanas depois:
  strategy_team implementou prática
  Nova performance: 72%
  Delta: +17%
    ↓
measureAdoptionImpact():
  baseline_performance: 0.55
  current_performance: 0.72
  performance_delta: +0.17
  cycles_tested: 1
  success: true (delta > 0.05)
  adoption_confidence: AUMENTA pra 0.7
    ↓
team_practice_adoption atualizado:
  - current_performance: 0.72
  - performance_delta: +0.17
  - success_count: 1
  - adoption_confidence: 0.7 (agora confiante)
    ↓
Resultado:
  - team_best_practices.times_applied: 2
  - team_best_practices.times_successful: 2
  - team_best_practices.performance_lift: +0.17 (validado)
    ↓
CMO vê:
  "📈 Impacto medido: strategy_team melhorou 17%!
   Prática: High Synergy Collaboration
   Adoção confidence: 70% → adotar permanentemente"
```

### Cenário 5: Network de Aprendizado

```
Time A (89% perf) → compartilhou prática X
  ↓ (transfer de conhecimento)
Time B (55% → 72% perf) ✓
  ↓ (agora ambos beneficiaram)
Mutual benefit criado
  ↓
team_learning_networks:
  - team_a_id: copywriter_designer
  - team_b_id: strategy
  - collaboration_count: 1
  - mutual_benefit_score: 0.85 (ambos ganharam)
  ↓
Organização aprende:
  - Padrão X se propaga
  - Mais times adotam
  - Performance média sobe
  ↓
CMO vê:
  "🤝 Learning network formada: copywriter_designer ↔ strategy
   Colaborações: 1 | Benefício mútuo: 85%"
```

---

## O Que Muda

### Novas Tabelas
```sql
team_best_practices:        -- padrões bem-sucedidos
  source_team_id, practice_type, success_rate, performance_lift

team_knowledge_transfer:    -- movimentação de conhecimento
  source_team_id, target_team_id, practice_id, transfer_status

team_practice_adoption:     -- como a prática é adaptada
  team_id, practice_id, adoption_status, performance_delta

team_learning_impact:       -- impacto quantificado
  source_team_id, target_team_id, performance_lift, adoption_rate

team_learning_networks:     -- redes de aprendizado
  team_a_id, team_b_id, collaboration_count, mutual_benefit_score

team_learning_events:       -- auditoria
  event_type, source_team_id, target_team_id
```

### Novas Funções
```javascript
discoverBestPractices(teamId)
  → Identifica padrões em times high-perf

proposeKnowledgeTransfer(sourceTeamId, targetTeamId, practiceId)
  → Propõe transferência de conhecimento

adoptPractice(teamId, practiceId)
  → Time começa a testar prática

measureAdoptionImpact(teamId, practiceId)
  → Mede se funcionou no novo contexto
```

---

## Dados

### team_best_practices table
```sql
source_team_id | practice_name              | success_rate | performance_lift
---------------|----------------------------|--------------|----------------
team-1         | High Synergy Collaboration | 0.89         | 0.24
team-2         | Rapid Iteration QA         | 0.85         | 0.18
```

### team_knowledge_transfer table
```sql
source_team_id | target_team_id | practice_id | transfer_status | started_at
---------------|----------------|-------------|-----------------|----------
team-1         | team-3         | p1          | in_progress     | 2026-04-17
team-2         | team-4         | p2          | completed       | 2026-04-16
```

### team_practice_adoption table
```sql
team_id | practice_id | adoption_status | performance_delta | adoption_confidence
--------|-------------|-----------------|-------------------|-------------------
team-3  | p1          | trial           | +0.17             | 0.7
team-4  | p2          | adopted         | +0.15             | 0.85
```

### team_learning_networks table
```sql
team_a_id | team_b_id | collaboration_count | mutual_benefit_score
----------|-----------|---------------------|-------------------
team-1    | team-3    | 1                   | 0.85
team-2    | team-4    | 1                   | 0.92
```

---

## Bridge Integration

```javascript
// A cada 360 ticks (~3 horas):
if (tickCount % 360 === 0) {
  await discoverTeamBestPractices();
}

// A cada 420 ticks (~3.5 horas):
if (tickCount % 420 === 0) {
  await transferTeamKnowledge();
}

discoverTeamBestPractices():
  ├─ Busca times com perf > 75%
  ├─ Extrai padrões de feedback
  └─ Descobre best practices

transferTeamKnowledge():
  ├─ Busca top team + low performing team
  ├─ Propõe transferência de prática
  └─ Log proposta
```

---

## Exemplo Real

```
Semana 1: copywriter_designer_team descobre padrão
  → "High Synergy Collaboration" registrada

Semana 2: Sistema detecta strategy_team com low perf
  → Propõe "High Synergy" como solução

Semana 2-3: strategy_team testa (trial)
  → Performance: 55% → 72%

Semana 4: Impacto validado
  → Adoption permanente (adopted)
  → Performance_lift confirmado: +17%

Semana 5: Novo time (content_team) vê sucesso
  → Também adota "High Synergy"
  → Network de aprendizado: 3 times conectados

Resultado: Padrão bem-sucedido se propaga organização-wide
```

---

## Next Steps

### Phase 8B (Learning Dashboard):
1. Knowledge transfer visualization
   - Práticas descobertas
   - Taxa de adoção por time
   - Impacto quantificado

2. Learning networks
   - Quais times aprendem juntos
   - Efetividade das transferências

---

Tá pronto? Vamo testar Phase 8! 🚀
