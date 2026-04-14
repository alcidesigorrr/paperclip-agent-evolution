# Phase 5: Testing Guide — Self-Improving Evaluation

## Setup (5 min)

```bash
# 1. Rodar migration
cd /Users/igoralcides/paperclip/bridge
supabase db push
# ou: psql postgresql://... < migrations/20260416_self_improving.sql

# 2. Iniciar Bridge
node bridge.mjs
```

---

## Cenário 1: Submeter Feedback (10 min)

### Objetivo
Registrar resultado de uma tarefa para análise.

### Via código:
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> await agent_evolution.submitFeedbackResult(
    'issue#456',
    'copywriter_sondar',
    'content_creation',
    'engagement',
    150,      // expected
    200,      // actual (foi melhor!)
    'Excelente post, muito bem escrito'
  );
```

### Ou via SQL:
```sql
INSERT INTO feedback_results 
(issue_id, agent_id, task_type, metric_type, expected_value, actual_value, feedback_text)
VALUES (
  'issue#456',
  'copywriter_sondar',
  'content_creation',
  'engagement',
  150,
  200,
  'Excelente post'
);

SELECT * FROM feedback_results WHERE agent_id = 'copywriter_sondar';
-- Esperado: 1 linha com success_percentage = 133
```

### Logs esperados
```
[phase5] 📊 Feedback registrado: copywriter_sondar em content_creation (133% sucesso)
```

---

## Cenário 2: Descobrir Padrões (20 min)

### Setup: Criar múltiplos feedbacks
```sql
-- Simular 5 tarefas bem-sucedidas (uma série de sucessos)
INSERT INTO feedback_results (issue_id, agent_id, task_type, metric_type, expected_value, actual_value, feedback_text)
VALUES
  ('issue#1', 'copywriter_sondar', 'content_creation', 'engagement', 100, 120, 'Bom'),
  ('issue#2', 'copywriter_sondar', 'content_creation', 'engagement', 110, 140, 'Excelente'),
  ('issue#3', 'copywriter_sondar', 'content_creation', 'engagement', 120, 130, 'Ótimo'),
  ('issue#4', 'copywriter_sondar', 'content_creation', 'engagement', 100, 145, 'Muito bom'),
  ('issue#5', 'copywriter_sondar', 'content_creation', 'engagement', 115, 150, 'Excelente');

-- Calcular success percentages
SELECT issue_id, (actual_value/expected_value)*100 as success_pct 
FROM feedback_results 
WHERE agent_id = 'copywriter_sondar';

-- Esperado: ~120%, 127%, 108%, 145%, 130% → media: 125%
```

### Descobrir padrões
```javascript
> const patterns = await agent_evolution.discoverLearningPatterns(
    'copywriter_sondar',
    'content_creation',
    4  // últimas 4 semanas
  );
> console.log(patterns);

// Esperado:
[
  {
    pattern: "copywriter_sondar tem 125% de sucesso em content_creation (expertise clara)",
    patternCategory: "expertise",
    confidence: 0.85
  },
  {
    pattern: "5/5 tarefas foram highly successful - expertise consolidada",
    patternCategory: "consistency",
    confidence: 0.90
  }
]
```

### Verificar resultado
```sql
SELECT * FROM agent_learning_patterns 
WHERE agent_id = 'copywriter_sondar'
ORDER BY confidence DESC;

-- Esperado:
pattern                                      | pattern_category | confidence
----------------------------------------------|------------------|----------
5/5 tarefas foram highly successful          | consistency     | 0.90
copywriter_sondar tem 125% de sucesso        | expertise       | 0.85
```

### Logs esperados
```
[phase5] 🎯 Padrão descoberto: "5/5 tarefas foram highly successful..." (conf: 0.90)
[phase5] 🎯 Padrão descoberto: "copywriter_sondar tem 125% de sucesso..." (conf: 0.85)
```

---

## Cenário 3: Skills Evolution (15 min)

### Setup: Executar tarefas com sucesso/falha
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');

// Tarefa 1: sucesso
> await agent_evolution.updateAgentSkills(
    'copywriter_sondar',
    'copywriting',
    'content_creation',
    true  // was successful
  );

// Tarefa 2: sucesso
> await agent_evolution.updateAgentSkills(
    'copywriter_sondar',
    'copywriting',
    'content_creation',
    true
  );

// Tarefa 3: falha
> await agent_evolution.updateAgentSkills(
    'copywriter_sondar',
    'copywriting',
    'content_creation',
    false  // falhou
  );
```

### Verificar skills
```sql
SELECT skill_name, proficiency_level, success_rate, times_used
FROM agent_skills
WHERE agent_id = 'copywriter_sondar';

-- Esperado:
skill_name  | proficiency_level | success_rate | times_used
------------|-------------------|--------------|----------
copywriting | 0.58              | 0.67         | 3
```

### Calcular:
- Proficiency: começa em 0.6 (sucesso), +0.02 por sucesso, -0.01 por falha
  - Start: 0.60
  - Tarefa 1: +0.02 → 0.62
  - Tarefa 2: +0.02 → 0.64
  - Tarefa 3: -0.01 → 0.63 (mas log mostra 0.58 no primeiro update)
  
- Success rate: 2 sucessos / 3 total = 0.67

### Logs esperados
```
[phase5] ✨ Novo skill descoberto: "copywriting" pro copywriter_sondar
[phase5] 📈 Skill "copywriting" atualizado: proficiency 0.62, success rate 1.00
[phase5] 📈 Skill "copywriting" atualizado: proficiency 0.64, success rate 1.00
[phase5] 📈 Skill "copywriting" atualizado: proficiency 0.63, success rate 0.67
```

---

## Cenário 4: Degradation Detection (20 min)

### Setup: Simular performance anterior boa + degradação recente
```sql
-- Anterior (5 tarefas): high performance
INSERT INTO feedback_results (issue_id, agent_id, task_type, feedback_text, expected_value, actual_value)
VALUES
  ('issue#old1', 'designer_sondar', 'design', 'Bom', 100, 135),
  ('issue#old2', 'designer_sondar', 'design', 'Bom', 100, 138),
  ('issue#old3', 'designer_sondar', 'design', 'Bom', 100, 140),
  ('issue#old4', 'designer_sondar', 'design', 'Bom', 100, 145),
  ('issue#old5', 'designer_sondar', 'design', 'Bom', 100, 132);
  
-- Recente (2 tarefas): degradação
INSERT INTO feedback_results (issue_id, agent_id, task_type, feedback_text, expected_value, actual_value, created_at)
VALUES
  ('issue#recent1', 'designer_sondar', 'design', 'Fraco', 100, 90, NOW() - interval '1 day'),
  ('issue#recent2', 'designer_sondar', 'design', 'Fraco', 100, 85, NOW());

-- Anterior avg: (135+138+140+145+132)/5 = 138%
-- Recente avg: (90+85)/2 = 87.5%
-- Degradação: (138-87.5)/138 = 36.6%
```

### Detectar degradação
```javascript
> const degradation = await agent_evolution.detectPerformanceDegradation(
    'designer_sondar',
    'design'
  );
> console.log(degradation);

// Esperado:
{
  agentId: 'designer_sondar',
  taskType: 'design',
  previousAvgScore: 138,
  currentAvgScore: 87.5,
  degradationPercentage: 36.6,
  probableCause: 'Possível esgotamento ou mudança de instrução'
}
```

### Verificar
```sql
SELECT * FROM performance_degradation 
WHERE agent_id = 'designer_sondar' AND status = 'alert';

-- Esperado:
agent_id       | task_type | degradation_percentage | status
----------------|-----------|----------------------|-------
designer_sondar | design    | 36.6                 | alert
```

### Verificar learning_events
```sql
SELECT * FROM learning_events 
WHERE agent_id = 'designer_sondar' AND event_type = 'issue_detected';

-- Esperado: 1 evento com type='issue_detected'
```

### Logs esperados
```
[phase5] ⚠️ ALERTA: designer_sondar degradou 36.6% em design
[phase5] 📈 Acurácia de votação atualizada...  (from learning event logging)
```

---

## Cenário 5: Generate Recommendations (20 min)

### Pré-requisitos
- Padrões descobertos (Cenário 2)
- Skills evoluído (Cenário 3)
- Degradação detectada (Cenário 4)

### Gerar recomendações
```javascript
> const recommendations = await agent_evolution.generateRecommendations(
    'copywriter_sondar'
  );
> console.log(recommendations);

// Esperado: 1-3 recomendações
[
  {
    recommendationType: 'task_assignment',
    title: 'Aumentar tarefas de content_creation',
    description: 'copywriter_sondar tem expertise clara em content_creation...',
    confidence: 0.85,
    potentialImpact: 'engagement +20%'
  },
  ...
]
```

### Verificar recomendações
```sql
SELECT * FROM ai_recommendations 
WHERE agent_id = 'copywriter_sondar' AND status = 'pending';

-- Esperado: 1-3 linhas com status='pending'
```

### Logs esperados
```
[phase5] 💡 3 recomendações geradas pra copywriter_sondar
```

---

## Cenário 6: Learning Context Injection (15 min)

### Objetivo
Verificar que learning context é injetado no briefing.

### Buscar learning context
```javascript
> const context = await agent_evolution.getAgentLearningContext(
    'copywriter_sondar'
  );
> console.log(context);

// Esperado: Markdown com padrões, skills, recomendações
```

### Exemplo output:
```markdown
## 🎯 Padrões de Sucesso Descobertos
- 5/5 tarefas foram highly successful... (confiança: 90%)
- copywriter_sondar tem 125% de sucesso... (confiança: 85%)

## 💪 Skills Desenvolvidos
- **copywriting**: proficiência 63% (67% success, 3 usos)

## 💡 Recomendações de Melhoria
- Aumentar tarefas de copywriting: copywriter_sondar tem expertise...
```

---

## Cenário 7: Bridge Auto-Analysis (30 min)

### Objetivo
Deixar Bridge rodar e ver análise automática.

### Setup: Deixar rodando
```bash
# Bridge vai rodar analyzeAgentLearning() a cada 240 ticks (~2 horas)
# Pra forçar mais rápido:

node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> await agent_evolution.discoverLearningPatterns('copywriter_sondar', 'content_creation', 4);
> await agent_evolution.detectPerformanceDegradation('copywriter_sondar');
> await agent_evolution.generateRecommendations('copywriter_sondar');
```

### Observar logs
```
[phase5] ✨ Padrão descoberto: "5/5 tarefas..." (conf: 0.90)
[phase5] 💡 3 recomendações geradas pra copywriter_sondar
```

### Verificar dados
```sql
-- Padrões descobertos
SELECT COUNT(*) FROM agent_learning_patterns 
WHERE agent_id = 'copywriter_sondar';
-- Deve ter >= 1

-- Skills rastreados
SELECT COUNT(*) FROM agent_skills 
WHERE agent_id = 'copywriter_sondar';
-- Deve ter >= 1

-- Recomendações geradas
SELECT COUNT(*) FROM ai_recommendations 
WHERE agent_id = 'copywriter_sondar' AND status = 'pending';
-- Deve ter >= 1
```

---

## Cenário 8: CMO Accepts/Rejects Recommendations (15 min)

### Setup: Ter recomendações pendentes
```sql
SELECT id, title, confidence FROM ai_recommendations 
WHERE status = 'pending' LIMIT 1;
-- Copie o ID
```

### CMO aceita recomendação
```sql
UPDATE ai_recommendations 
SET status = 'accepted', accepted_at = NOW()
WHERE id = 'uuid-recommendation-1';

SELECT status FROM ai_recommendations WHERE id = 'uuid-recommendation-1';
-- Esperado: 'accepted'
```

### CMO rejeita
```sql
UPDATE ai_recommendations 
SET status = 'rejected'
WHERE id = 'uuid-recommendation-2';

SELECT status FROM ai_recommendations WHERE id = 'uuid-recommendation-2';
-- Esperado: 'rejected'
```

---

## Debugging: Por que patterns não aparecem?

### Checklist

```
1. ✅ Feedback foi registrado?
   SELECT COUNT(*) FROM feedback_results 
   WHERE agent_id = 'copywriter_sondar';
   Deve ter >= 5 feedbacks

2. ✅ Success percentages estão OK?
   SELECT issue_id, expected_value, actual_value 
   FROM feedback_results 
   WHERE agent_id = 'copywriter_sondar';
   Verifica se actual/expected > 1.0 ou < 1.0

3. ✅ Padrões foram descobertos?
   SELECT COUNT(*) FROM agent_learning_patterns 
   WHERE agent_id = 'copywriter_sondar';
   Deve ter >= 1

4. ✅ Skills foram atualizados?
   SELECT COUNT(*) FROM agent_skills 
   WHERE agent_id = 'copywriter_sondar';
   Deve ter >= 1

5. ✅ Bridge rodou analyzeAgentLearning()?
   Procurar por [phase5] nos logs
   
6. ✅ Degradação foi detectada (se houver)?
   SELECT COUNT(*) FROM performance_degradation 
   WHERE status = 'alert';
   Se agente degradou, deve ter entrada
```

---

## Performance Monitoring

### Query Times
```sql
-- Pattern discovery deve ser < 500ms
EXPLAIN ANALYZE
SELECT * FROM feedback_results 
WHERE agent_id = 'copywriter_sondar'
  AND created_at > NOW() - interval '4 weeks'
ORDER BY created_at DESC;

-- Degradation detection deve ser < 100ms
EXPLAIN ANALYZE
SELECT * FROM feedback_results 
WHERE agent_id = 'copywriter_sondar'
ORDER BY created_at DESC LIMIT 10;
```

### Logs to Monitor
```
[phase5] 📊 Feedback registrado
  → Feedback submitted successfully
  
[phase5] ✨ Padrão descoberto
  → New pattern found
  
[phase5] 💪 Skill "X" atualizado
  → Skill proficiency updated
  
[phase5] ⚠️ ALERTA: {agent} degradou
  → Performance degradation detected
  
[phase5] 💡 {N} recomendações geradas
  → Recommendations generated
  
[phase5-err] Erro ao...
  → Error occurred
```

---

## Test Checklist

| Test | ✓ | How to Verify |
|------|---|---------------|
| Submit feedback | | Appears in feedback_results |
| Calculate success % | | success_percentage = (actual/expected)*100 |
| Discover patterns | | Patterns appear in agent_learning_patterns |
| Track skills | | Skills appear in agent_skills with proficiency |
| Detect degradation | | Degradation > 15% triggers alert |
| Generate recommendations | | Recommendations in ai_recommendations |
| Inject learning context | | getAgentLearningContext returns markdown |
| Bridge auto-analysis | | Logs show [phase5] patterns/recommendations |
| CMO accepts/rejects | | Status changes from pending to accepted/rejected |
| Proficiency grows with success | | proficiency_level increases on wins, decreases on losses |

---

## Full Integration Flow

```
[Feedback Submitted] 
    ↓
[discoverLearningPatterns - 5+ feedbacks]
    ↓
[updateAgentSkills - proficiency & success_rate]
    ↓
[detectPerformanceDegradation - if > 15% drop]
    ↓
[generateRecommendations - task_assignment, skill_dev, pairing]
    ↓
[getAgentLearningContext - inject to briefing]
    ↓
[CMO sees in dashboard + briefing]
    ↓
[CMO accepts/rejects recommendations]
    ↓
[System learns what CMO approves]
```

---

Ready to test? Start with Cenário 1 and work through! 🚀
