# Phase 3: Testing Guide — Agent Forking & Specialization

## Setup (10 min)

Phase 3 tá integrada. Nenhum setup especial além de rodar a migration.

```bash
# 1. Rodar migration
cd /Users/igoralcides/paperclip/bridge
supabase db push
# ou: psql postgresql://... < migrations/20260414_agent_forking.sql

# 2. Iniciar Bridge
node bridge.mjs
```

---

## Cenário 1: Detectar Especialização (15 min)

### Objetivo
Fazer um agente parecer especialista em um pilar e ver sistema detectar.

### Setup: Criar posts simulados
```sql
-- Copywriter criando posts variados (4 semanas)
INSERT INTO social_posts (
  type, pillar, caption, status, metrics, published_at, paperclip_agent
) VALUES
-- Cases (9 posts com alto engagement)
  ('instagram_post', 'cases_resultados', 'Case 1', 'published', 
   '{"likes": 150, "comments": 20, "shares": 10}'::jsonb, NOW() - interval '20 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 2', 'published', 
   '{"likes": 140, "comments": 18, "shares": 9}'::jsonb, NOW() - interval '18 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 3', 'published', 
   '{"likes": 160, "comments": 22, "shares": 11}'::jsonb, NOW() - interval '16 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 4', 'published', 
   '{"likes": 155, "comments": 21, "shares": 10}'::jsonb, NOW() - interval '14 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 5', 'published', 
   '{"likes": 170, "comments": 25, "shares": 12}'::jsonb, NOW() - interval '12 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 6', 'published', 
   '{"likes": 145, "comments": 19, "shares": 9}'::jsonb, NOW() - interval '10 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 7', 'published', 
   '{"likes": 165, "comments": 23, "shares": 11}'::jsonb, NOW() - interval '8 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 8', 'published', 
   '{"likes": 150, "comments": 20, "shares": 10}'::jsonb, NOW() - interval '6 days', 'copywriter_sondar'),
  ('instagram_post', 'cases_resultados', 'Case 9', 'published', 
   '{"likes": 155, "comments": 21, "shares": 10}'::jsonb, NOW() - interval '4 days', 'copywriter_sondar'),

-- Tips (5 posts com baixo engagement)
  ('instagram_post', 'dicas_produtividade', 'Tip 1', 'published', 
   '{"likes": 60, "comments": 5, "shares": 2}'::jsonb, NOW() - interval '19 days', 'copywriter_sondar'),
  ('instagram_post', 'dicas_produtividade', 'Tip 2', 'published', 
   '{"likes": 70, "comments": 6, "shares": 3}'::jsonb, NOW() - interval '17 days', 'copywriter_sondar'),
  ('instagram_post', 'dicas_produtividade', 'Tip 3', 'published', 
   '{"likes": 65, "comments": 5, "shares": 2}'::jsonb, NOW() - interval '15 days', 'copywriter_sondar'),
  ('instagram_post', 'dicas_produtividade', 'Tip 4', 'published', 
   '{"likes": 75, "comments": 7, "shares": 3}'::jsonb, NOW() - interval '13 days', 'copywriter_sondar'),
  ('instagram_post', 'dicas_produtividade', 'Tip 5', 'published', 
   '{"likes": 70, "comments": 6, "shares": 2}'::jsonb, NOW() - interval '11 days', 'copywriter_sondar');
```

### Trigger detection
```bash
# Bridge roda detection a cada 960 ticks (~8 horas)
# Ou força manualmente:

# Abrir console Node.js:
node
> const bridge = require('./bridge.mjs');
> (Ctrl+C depois de ver logs)
```

Ou esperar até Bridge rodar naturalmente.

### Verificar resultado
```sql
-- Ver sugestão criada
SELECT * FROM specialization_suggestions 
WHERE status = 'pending';

-- Esperado:
parent_agent_id: copywriter_sondar
suggested_fork_name: copywriter_cases_specialist
confidence: ~0.88
```

### Logs esperados
```
[phase3] Checando oportunidades de especialização...
[evolution] 🔍 Especialização detectada: copywriter_sondar em "cases_resultados" (confidence: 0.88)
[phase3] ✅ Sugestão salva: copywriter_cases_specialist (conf: 0.88)
```

---

## Cenário 2: Aprovar Fork (10 min)

### Pré-requisito
Sugestão salva do Cenário 1.

### Aprovação via função diretamente
```javascript
// Para testar sem admin UI, chamar diretamente:
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> const suggestionId = 'uuid-da-sugestão'; // Get from DB
> agent_evolution.approveForkSuggestion(suggestionId, 'cmo_sondar');
```

### Verificar resultado
```sql
-- Ver fork criado
SELECT * FROM agent_forks WHERE parent_agent_id = 'copywriter_sondar';

-- Esperado:
fork_name: copywriter_cases_specialist
parent_agent_id: copywriter_sondar
is_active: true
specialization: {"pillar": "cases_resultados", ...}
refined_instructions: "## ESPECIALISTA EM CASES..."

-- Ver sugestão com status atualizado
SELECT * FROM specialization_suggestions 
WHERE id = 'suggestionId'
  AND status = 'implemented';
```

### Logs esperados
```
[evolution] 🔧 Criando fork: copywriter_cases_specialist
[evolution] ✅ Fork criado: copywriter_cases_specialist
```

---

## Cenário 3: Rejeitar Fork (10 min)

### Objetivo
Testar fluxo de rejeição (CMO clica "no").

### Setup
Criar segunda sugestão (ou usar uma existente).

### Rejeitar
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> agent_evolution.rejectForkSuggestion(suggestionId, 'Não é clara a especialização');
```

### Verificar
```sql
SELECT status FROM specialization_suggestions WHERE id = 'suggestionId';
-- Esperado: 'rejected'
```

---

## Cenário 4: Múltiplos Forks (20 min)

### Objetivo
Criar especialização pra vários agentes.

### Setup: Posts diversificados
```sql
-- Designer: instagram_post vs carousel variance
INSERT INTO social_posts (type, pillar, caption, status, metrics, published_at, paperclip_agent)
VALUES
  -- Instagram posts (alto engagement)
  ('instagram_post', 'cases_resultados', 'Design 1', 'published', 
   '{"likes": 180, "comments": 25, "shares": 12}'::jsonb, NOW() - interval '15 days', 'designer_sondar'),
  ('instagram_post', 'cases_resultados', 'Design 2', 'published', 
   '{"likes": 190, "comments": 28, "shares": 14}'::jsonb, NOW() - interval '10 days', 'designer_sondar'),
  ('instagram_post', 'cases_resultados', 'Design 3', 'published', 
   '{"likes": 175, "comments": 24, "shares": 11}'::jsonb, NOW() - interval '5 days', 'designer_sondar'),
  
  -- Carousels (baixo engagement)
  ('instagram_carousel', 'cases_resultados', 'Carousel 1', 'published', 
   '{"likes": 80, "comments": 8, "shares": 3}'::jsonb, NOW() - interval '14 days', 'designer_sondar'),
  ('instagram_carousel', 'cases_resultados', 'Carousel 2', 'published', 
   '{"likes": 85, "comments": 9, "shares": 4}'::jsonb, NOW() - interval '9 days', 'designer_sondar'),
  ('instagram_carousel', 'cases_resultados', 'Carousel 3', 'published', 
   '{"likes": 78, "comments": 7, "shares": 3}'::jsonb, NOW() - interval '4 days', 'designer_sondar');

-- Content creator: technical vs tips variance
INSERT INTO social_posts (type, pillar, caption, status, metrics, published_at, paperclip_author)
VALUES
  -- Technical (alto)
  ('blog_article', 'educacional_tecnico', 'Technical 1', 'published', 
   '{"likes": 250, "comments": 35, "shares": 20}'::jsonb, NOW() - interval '15 days', 'content_creator_sondar'),
  ('blog_article', 'educacional_tecnico', 'Technical 2', 'published', 
   '{"likes": 270, "comments": 40, "shares": 25}'::jsonb, NOW() - interval '10 days', 'content_creator_sondar'),
  
  -- Tips (baixo)
  ('blog_article', 'dicas_produtividade', 'Tip 1', 'published', 
   '{"likes": 100, "comments": 10, "shares": 5}'::jsonb, NOW() - interval '14 days', 'content_creator_sondar'),
  ('blog_article', 'dicas_produtividade', 'Tip 2', 'published', 
   '{"likes": 110, "comments": 12, "shares": 6}'::jsonb, NOW() - interval '9 days', 'content_creator_sondar');
```

### Detectar
Bridge vai encontrar 2 sugestões:
```
[phase3] ✅ Sugestão salva: designer_instagram_specialist (conf: 0.82)
[phase3] ✅ Sugestão salva: content_creator_technical_specialist (conf: 0.85)
```

### Aprovar todos
```sql
-- Approve via SQL updates ou código
SELECT COUNT(*) FROM specialization_suggestions WHERE status = 'implemented';
-- Esperado: 3 (copywriter_cases + designer_instagram + content_creator_technical)
```

### Verificar
```sql
SELECT fork_name, parent_agent_id, is_active 
FROM agent_forks 
ORDER BY created_at DESC;

-- Esperado:
content_creator_technical_specialist | content_creator_sondar | true
designer_instagram_specialist        | designer_sondar        | true
copywriter_cases_specialist          | copywriter_sondar      | true
```

---

## Cenário 5: Refined Instructions (15 min)

### Objetivo
Verificar que instructions foram customizadas pro fork.

### Check
```sql
SELECT fork_name, refined_instructions 
FROM agent_forks 
WHERE fork_name = 'copywriter_cases_specialist';
```

### Expected output:
```
fork_name: copywriter_cases_specialist
refined_instructions:

## 📝 ESPECIALISTA EM CASES_RESULTADOS

Você é especialista em copywriting para conteúdo do pilar **cases_resultados**.

### Sua Especialidade
- Conteúdo tipo: cases_resultados
- Tone: adaptado para cases_resultados audience
- Foco: maximize engagement neste pilar

### O Que NÃO Fazer
- ❌ Nunca aceitar tarefas de "dicas_produtividade" — delegue pra copywriter generalista
- ❌ Não mesclar estilo de dicas_produtividade com cases_resultados

### Padrões que Funcionam em "cases_resultados"
(Serão preenchidos baseado em dados históricos)

### Métricas de Sucesso
- Target engagement: 1.5x acima da média
- Success rate: 80%+ posts bem recebidos
```

---

## Debugging: Por que detection não funciona?

### Checklist
```
1. ✅ Agent tem 4+ posts por categoria?
   SELECT agent_id, pillar, COUNT(*) 
   FROM social_posts 
   WHERE agent_id = 'copywriter_sondar'
   GROUP BY agent_id, pillar;

2. ✅ Posts têm metrics?
   SELECT COUNT(*) FROM social_posts 
   WHERE agent_id = 'copywriter_sondar' 
   AND metrics IS NOT NULL;

3. ✅ Variance > 2.0x?
   SELECT pillar, AVG(engagement) 
   FROM (
     SELECT pillar, 
       (metrics->>'likes')::int + 
       (metrics->>'comments')::int + 
       (metrics->>'shares')::int as engagement
     FROM social_posts 
     WHERE agent_id = 'copywriter_sondar'
   ) sub
   GROUP BY pillar;
   
   Max_engagement / Min_engagement > 2.0?

4. ✅ Bridge rodou detection?
   Procurar por [phase3] nos logs
   
5. ✅ Sugestão foi salva?
   SELECT * FROM specialization_suggestions 
   WHERE parent_agent_id = 'copywriter_sondar';
```

---

## Performance Monitoring

### Query Times
```sql
-- Deve ser rápido (<500ms)
EXPLAIN ANALYZE
SELECT agent_id, pillar, COUNT(*), AVG(engagement)
FROM (
  SELECT agent_id, pillar,
    (metrics->>'likes')::int + 
    (metrics->>'comments')::int + 
    (metrics->>'shares')::int as engagement
  FROM social_posts 
  WHERE published_at > NOW() - interval '4 weeks'
) sub
GROUP BY agent_id, pillar;
```

### Logs to Monitor
```
[phase3] Checando oportunidades...
  → Start of detection phase
  
[evolution] 🔍 Especialização detectada: X em "Y" (confidence: Z)
  → Specialization found
  
[phase3] ✅ Sugestão salva: ...
  → Suggestion saved successfully
  
[phase3-err] Erro ao checar especialização: ...
  → Error occurred
```

---

## Test Checklist

| Test | ✓ | How to Verify |
|------|---|---------------|
| Detect specialization | | Logs show [phase3] ✅ Sugestão salva |
| Suggestion saved | | query specialization_suggestions |
| Fork created on approval | | query agent_forks, is_active=true |
| Refined instructions generated | | query agent_forks, read refined_instructions |
| Multiple forks detected | | 3+ suggestions in specialization_suggestions |
| Performance < 500ms | | EXPLAIN ANALYZE detection query |
| Rejection works | | Suggestion status = 'rejected' |
| Confidence scores reasonable | | confidence between 0.7-0.95 |

---

## Next Steps

After validating Phase 3:

1. ✅ Implement admin UI
   - /api/specialization-suggestions endpoint
   - Form buttons [Approve] [Reject]
   
2. ✅ Update CMO agent prompt
   - Include available forks
   - Route tasks to forks
   
3. ✅ Test real workflow
   - Create briefing
   - CMO sees fork suggestions
   - CMO approves
   - Next briefing routes to fork
   
4. 🔜 Phase 4: Consensus Voting
   - When agents disagree → vote
   - CMO arbitrates ties

---

Ready to test? Run Cenário 1 and let me know what you see! 🚀
