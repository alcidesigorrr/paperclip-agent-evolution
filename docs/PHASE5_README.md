# 🧠 Phase 5: Self-Improving Evaluation — Agentes Aprendem com Feedback

## TL;DR

Seu sistema agora:
1. **Coleta feedback** de cada tarefa (engagement, quality, time)
2. **Detecta padrões** que agente tá fazendo bem (timing, estilo, audience)
3. **Rastreia skills** de cada agente com proficiency scores
4. **Gera recomendações** automáticas pro CMO
5. **Detecta degradação** (agente piora → alerta automático)
6. **Injeta aprendizados** no próximo briefing

**Resultado**: Agentes melhoram continuamente. CMO recebe insights automáticos. Sistema recomenda ações baseadas em dados reais.

---

## Como Funciona

### Cenário 1: Feedback → Padrão Descoberto

```
Tarefa completa:
  Post de case study publicado
  Expected engagement: 150
  Actual engagement: 200
    ↓
submitFeedbackResult():
  - issue_id: issue#456
  - agent: copywriter_sondar
  - task_type: content_creation
  - metric: engagement
  - expected: 150
  - actual: 200
  - success: 133%
    ↓
Sistema descobre padrão (depois de 5+ tarefas):
  "Posts de terça têm 95% de sucesso"
  "copywriter_sondar tem 89% expertise em cases"
    ↓
discoverLearningPatterns():
  - Pattern 1: timing (segunda, terça, quarta)
  - Pattern 2: expertise (89% avg success rate)
  - Pattern 3: consistency (5/5 tarefas bem-sucedidas)
    ↓
Padrões salvos com confidence 0.85+
    ↓
CMO vê no briefing:
  "🎯 copywriter_sondar: posts terça têm 95% sucesso
   Recomendação: priorizar tarefas pra terça"
```

### Cenário 2: Detectar Degradação

```
Agente tá piorando:
  Semanas 1-2: avg 85% success
  Semanas 3-4: avg 60% success
    ↓
detectPerformanceDegradation():
  - Previous avg (5 tarefas): 85%
  - Recent avg (2 tarefas): 60%
  - Degradação: 25%
    ↓
Alerta criado:
  status = 'alert'
  probable_cause = "Possível esgotamento"
    ↓
CMO vê dashboard:
  "⚠️ copywriter_sondar degradou 25% em content_creation
   Investigar: esgotamento, mudança de instrução?"
```

### Cenário 3: Skills Evoluem

```
Agente faz vários posts bem-sucedidos:
  Post 1 (copywriting) → 88% success ✓
  Post 2 (copywriting) → 92% success ✓
  Post 3 (copywriting) → 85% success ✓
  Post 4 (design) → 70% success ✓
    ↓
updateAgentSkills():
  Skill "copywriting":
    - times_used: 3
    - success_rate: 88%
    - proficiency: 0.78 → 0.84 (ganha +0.06 por sucesso)
  
  Skill "design":
    - times_used: 1
    - success_rate: 70%
    - proficiency: 0.30 → 0.35
    ↓
CMO vê:
  "💪 Copywriting: proficiency 84% (88% success)
   💪 Design: proficiency 35% (70% success)
   
   Recomendação: mais tasks de copywriting, menos de design"
```

### Cenário 4: Recomendações Automáticas

```
Sistema analisa tudo:
  Padrões descobertos: 2
  Skills altos: 1
  Degradação detectada: 0
  Oportunidades: 3
    ↓
generateRecommendations():
  1. "Aumentar tarefas de copywriting" (conf: 0.85)
     → Agente tem 84% proficiency
  
  2. "Emparejar com designer_sondar" (conf: 0.75)
     → Combinar copywriting forte com design fraco
  
  3. "Priorizar tarefas nas terças" (conf: 0.88)
     → Pattern: 95% success nas terças
    ↓
Recomendações salvas em AI_recommendations
    ↓
CMO vê na dashboard:
  "💡 Recomendações pra copywriter_sondar
   ✓ Aumentar tarefas de copywriting (+20%)
   ✓ Emparejar com designer_sondar
   ✓ Priorizar terças (95% sucesso)
   
   [Aceitar todas] [Revisar individualmente]"
```

---

## O Que Muda no Código

### Novas Tabelas

```sql
feedback_results:           -- resultado de cada tarefa
  id, issue_id, agent_id, task_type, metric_type, 
  expected_value, actual_value, success_percentage, feedback_text

agent_learning_patterns:   -- padrões descobertos
  agent_id, task_type, pattern, pattern_category,
  confidence, times_validated

performance_degradation:   -- alertas de queda de performance
  agent_id, task_type, previous_avg, current_avg,
  degradation_percentage, probable_cause, status

agent_skills:              -- proficiency por skill
  agent_id, skill_name, proficiency_level,
  times_used, success_rate

learning_events:           -- log de eventos de aprendizado
  agent_id, event_type, description, old_value, new_value

ai_recommendations:        -- recomendações geradas
  issue_id, agent_id, recommendation_type, title,
  description, confidence, status
```

### Novas Funções

```javascript
submitFeedbackResult(issueId, agentId, taskType, metricType, expected, actual, feedback)
  → Registra resultado de uma tarefa

discoverLearningPatterns(agentId, taskType, weeksBack)
  → Analisa últimas N semanas, detecta padrões
  → Retorna: timing, expertise, consistency patterns
  → Salva com confidence score

detectPerformanceDegradation(agentId, taskType)
  → Compara últimas 2 vs 5 anteriores
  → Se degradação > 15%, cria alerta
  
updateAgentSkills(agentId, skillName, taskType, wasSuccessful)
  → Atualiza proficiency + success_rate do skill
  → +0.02 por sucesso, -0.01 por falha
  
generateRecommendations(agentId)
  → Analisa padrões, skills, degradação
  → Gera 3-5 recomendações com confidence
  
getAgentLearningContext(agentId)
  → Retorna markdown com padrões + skills + recomendações
  → Pra injetar no briefing
```

### Integração no Bridge

```javascript
// A cada 240 ticks (~2 horas):
if (tickCount % 240 === 0) {
  await analyzeAgentLearning();  // descobre padrões, detecta degradação, gera recomendações
}

// Ao criar briefing:
const learningContext = await buildLearningBriefing(agentId);
briefing += learningContext;  // adiciona ao briefing final
```

---

## Exemplos de Padrões Descobertos

### Padrão 1: Timing (Dia da Semana)
```
Descoberta automática:
  Posts publicados na terça: média 95% sucesso
  Posts publicados na sexta: média 60% sucesso
  
Razão: Audiência mais engajada no meio da semana
  
Recomendação:
  "Priorizar publicações pra segunda-quarta (95% vs 70%)"
```

### Padrão 2: Expertise (Tipo de Conteúdo)
```
Descoberta automática:
  Posts de case study: 88% sucesso (10 posts)
  Posts de dicas: 65% sucesso (8 posts)
  
Razão: Agente é especialista em cases, fraco em dicas
  
Recomendação:
  "Aumentar assignments de cases (2x mais)"
  "Delegar dicas pro content_creator_sondar"
```

### Padrão 3: Consistency (Variância Baixa)
```
Descoberta automática:
  Últimas 5 tarefas: 85%, 88%, 86%, 87%, 84%
  Variância: baixa → agente é consistente
  
Razão: Performance previsível e confiável
  
Recomendação:
  "Agente pronto pra tarefas críticas"
```

---

## Skills Sistema

### Skill Proficiency Tracking

```
Cada agente tem múltiplos skills:
  - copywriting (proficiency: 0.78, times_used: 15, success_rate: 0.88)
  - design (proficiency: 0.45, times_used: 8, success_rate: 0.70)
  - seo_optimization (proficiency: 0.62, times_used: 12, success_rate: 0.75)

Proficiency cresce com sucesso:
  - Tarefa bem-sucedida: proficiency += 0.02
  - Tarefa falhada: proficiency -= 0.01

Success Rate atualizado:
  success_rate = (successes / total_uses)
```

### Skill Assignment

CMO vê skills do agente e pode:
```
- Delegar mais tarefas pra skills altos (0.7+)
- Oferecer treinamento em skills baixos (< 0.5)
- Emparejar agentes com skills complementares
```

---

## Degradation Detection

### Como Detecta
```
1. Query últimas 10 tarefas do agente
2. Separa: últimas 2 vs anteriores 5
3. Calcula média de sucesso de cada grupo
4. Se queda > 15%, cria alerta

Exemplo:
  Anterior (5): 85%, 88%, 86%, 87%, 84% → avg 86%
  Recente (2): 60%, 65% → avg 62.5%
  Degradação: (86 - 62.5) / 86 = 27% → ALERTA!
```

### O que Fazer
```
CMO vê alerta:
  "⚠️ copywriter_sondar degradou 27% em content_creation
   
   Provável causa: Possível esgotamento ou mudança de instrução
   
   Ações recomendadas:
   - Conversar com agente
   - Revisar instruções recentes
   - Dar descanso (menos tarefas)
   - Retraining em padrões que funcionaram"
```

---

## Dados Salvos

### feedback_results table:
```sql
SELECT * FROM feedback_results 
WHERE agent_id = 'copywriter_sondar' 
ORDER BY created_at DESC;

issue_id | agent_id           | task_type        | success_percentage | created_at
---------|--------------------|--------------------|---------------------|----------
issue#1  | copywriter_sondar  | content_creation | 133                | 2026-04-16
issue#2  | copywriter_sondar  | content_creation | 120                | 2026-04-15
issue#3  | copywriter_sondar  | content_creation | 88                 | 2026-04-14
```

### agent_learning_patterns table:
```sql
SELECT * FROM agent_learning_patterns 
WHERE confidence > 0.7;

agent_id          | pattern                              | confidence | times_validated
------------------|--------------------------------------|------------|----------------
copywriter_sondar | Posts terça têm 95% sucesso          | 0.88       | 3
copywriter_sondar | Expertise em cases (89% avg)        | 0.85       | 5
designer_sondar   | Instagram posts 1.9x melhor         | 0.82       | 2
```

### agent_skills table:
```sql
SELECT * FROM agent_skills 
WHERE proficiency_level > 0.7
ORDER BY proficiency_level DESC;

agent_id          | skill_name    | proficiency_level | times_used | success_rate
------------------|---------------|-------------------|-----------|-----------
copywriter_sondar | copywriting   | 0.84              | 15        | 0.88
content_creator   | seo           | 0.75              | 12        | 0.80
designer_sondar   | design        | 0.72              | 20        | 0.85
```

### ai_recommendations table:
```sql
SELECT * FROM ai_recommendations 
WHERE status = 'pending'
LIMIT 5;

agent_id          | recommendation_type | title                          | confidence
------------------|-------------------|--------------------------------|----------
copywriter_sondar | task_assignment    | Aumentar tarefas de copywriting| 0.85
copywriter_sondar | agent_pairing      | Emparejar com designer_sondar | 0.75
designer_sondar   | skill_development  | Treinar em mobile design       | 0.70
```

---

## Comportamento por Semana

### Semana 1-3 (Building Feedback)
- Bridge coleta feedback de tarefas
- Sem padrões ainda (min 5 tarefas)
- Skills começam a emergir

### Semana 4+
```
Logs:
[phase5] ✨ Padrão descoberto: "Posts terça têm 95% sucesso" (conf: 0.88)
[phase5] 💪 Skill "copywriting" atualizado: proficiency 0.84, success rate 0.88
[phase5] 💡 3 recomendações geradas pra copywriter_sondar
[phase5] ✅ Learning context injetado no briefing
```

### Quando há degradação
```
Logs:
[phase5] ⚠️ ALERTA: copywriter_sondar degradou 25% em content_creation
[phase5] 📊 Causa provável: Possível esgotamento
[phase5] 💡 Recomendação: Investigar + dar descanso
```

---

## Admin Dashboard Integration

CMO vê:

```
## 🧠 Agent Learning Hub

### copywriter_sondar
Status: ✅ Thriving (performance +15% vs baseline)

**Padrões de Sucesso:**
- 📊 Posts terça: 95% sucesso
- 🎯 Cases expertise: 89% success rate
- 📈 Consistência: 5/5 últimas tarefas bem-sucedidas

**Skills Desenvolvidos:**
- 💪 Copywriting: 84% proficiency (88% success, 15 usos)
- 💪 Engagement tactics: 72% proficiency (78% success)

**Recomendações:**
- ✅ Aumentar tarefas de copywriting (+20%)
- ✅ Priorizar publicações pra terça
- ✅ Emparejar com designer_sondar em projetos grandes

**Histórico de Aprendizado:**
- 2026-04-16: Pattern descoberto (posts terça)
- 2026-04-15: Skill copywriting upgraded 0.82→0.84
- 2026-04-14: Expertise em cases confirmada
```

---

## Next Steps

### Phase 5B (Dashboard Integration):
1. Endpoint `/api/agent-learning/{agentId}`
   - Retorna patterns, skills, recommendations, learning history
   
2. Dashboard UI
   - Skill proficiency chart
   - Pattern timeline
   - Recommendation list with accept/reject

3. Feedback form
   - CMO submete feedback de tarefas completadas
   - Sistema auto-calcula success percentages

### Depois:
- **Phase 6**: Dynamic Company Structure (agentes auto-criam/dissolvem)
- **Phase 7**: Emergent Team Formations (agentes decidem trabalhar juntos)

---

Tá pronto? Vamo testar Phase 5! 🚀
