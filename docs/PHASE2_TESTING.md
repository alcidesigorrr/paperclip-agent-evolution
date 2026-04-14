# Phase 2: Testing Guide — Emergent Behavior

## Setup Rápido (5 min)

Phase 2 já tá integrada. Nenhum setup especial.

```bash
cd /Users/igoralcides/paperclip/bridge
git pull  # ou pega as mudanças se vc tiver clonado
node bridge.mjs
```

---

## Cenário 1: Testar Análise Básica (10 min)

### Pré-requisito: Ter posts publicados
```sql
-- Se não tiver posts publicados ainda, criar alguns manualmente
INSERT INTO social_posts (
  type, pillar, caption, status, metrics, published_at, paperclip_agent
) VALUES
  ('instagram_post', 'cases_resultados', 'Case: 3x Mais Rápido', 'published', 
   '{"likes": 120, "comments": 15, "shares": 8}'::jsonb, NOW() - interval '2 days', 'copywriter_sondar'),
  ('instagram_post', 'dicas_produtividade', 'Dica: Como Usar SPT', 'published',
   '{"likes": 45, "comments": 3, "shares": 1}'::jsonb, NOW() - interval '1 day', 'copywriter_sondar'),
  ('instagram_carousel', 'cases_resultados', 'Case: Redução de Tempo', 'published',
   '{"likes": 95, "comments": 12, "shares": 5}'::jsonb, NOW() - interval '3 days', 'designer_sondar');
```

### Disparar briefing
```sql
-- Criar um social_calendar novo
INSERT INTO social_calendar (week_start, week_end, plan, status)
VALUES (
  '2026-04-21',
  '2026-04-27',
  '{"briefing": "Gerar conteudo semana 4"}'::jsonb,
  'awaiting_agent'
);
```

### Acompanhar logs
```bash
node bridge.mjs 2>&1 | grep -E "\[briefing\]|\[evolution\]"
```

**O que esperar:**
```
[briefing] Analisando performance histórica...
[briefing] Adicionado: 3 insights + 2 recomendações
```

### Verificar resultado no Paperclip
Issue criada pra CMO deve incluir:
```
## 📊 Performance das Últimas 8 Semanas (3 posts)

### Insights
- 📈 "cases_resultados" pilar tá gerando 166% mais engagement que "dicas_produtividade"
- ⭐ Posts de tipo "instagram_carousel" têm 95 engagements médios
- 🏆 designer_sondar tá liderando com 95 engagements por post

### Recomendações pra Esta Semana
- ✅ Aumentar frequência de posts "cases_resultados" — tá rendendo muito
- 📱 Priorizar "instagram_carousel" — formato está convertendo melhor
```

---

## Cenário 2: Testar com Dados Realistas (30 min)

### Setup: Popular com 4 semanas de posts
```sql
-- Gerar 32 posts distribuídos entre 4 semanas
-- (Executar no Supabase SQL Editor)

WITH dates AS (
  SELECT generate_series(
    NOW() - interval '30 days',
    NOW(),
    interval '1 day'
  ) as d
)
INSERT INTO social_posts (
  type, pillar, caption, title, status, metrics, published_at, paperclip_agent
)
SELECT
  CASE WHEN random() > 0.5 THEN 'instagram_post' ELSE 'instagram_carousel' END,
  (ARRAY['cases_resultados', 'dicas_produtividade', 'educacional_tecnico', 'tendencias_setor'])[floor(random() * 4 + 1)],
  'Lorem ipsum dolor sit amet...',
  'Post #' || row_number() OVER (),
  'published',
  jsonb_build_object(
    'likes', floor(random() * 200 + 20),
    'comments', floor(random() * 30 + 2),
    'shares', floor(random() * 10 + 1),
    'reach', floor(random() * 5000 + 500)
  ),
  d,
  (ARRAY['copywriter_sondar', 'designer_sondar', 'social_media_manager_sondar'])[floor(random() * 3 + 1)]
FROM dates
WHERE d != NOW()
LIMIT 32;
```

### Disparar briefing
```sql
INSERT INTO social_calendar (week_start, week_end, plan, status)
VALUES (
  '2026-04-21',
  '2026-04-27',
  '{"briefing": "Semana 4 - Conteudo"}'::jsonb,
  'awaiting_agent'
) RETURNING id;
```

### Acompanhar
```bash
# Terminal 1: Bridge rodando
node bridge.mjs

# Terminal 2: Monitorar logs
tail -f /tmp/bridge.log | grep -E "\[briefing\]|\[extraction\]"
```

### Checar Insights Gerados
```sql
-- Ver qual pilar tem melhor performance
SELECT pillar, COUNT(*) as count, AVG((metrics->>'likes')::int) as avg_likes
FROM social_posts
WHERE status = 'published'
  AND metrics IS NOT NULL
  AND published_at > NOW() - interval '30 days'
GROUP BY pillar
ORDER BY avg_likes DESC;

-- Ver qual tipo funciona melhor
SELECT type, COUNT(*) as count, AVG((metrics->>'likes')::int) as avg_likes
FROM social_posts
WHERE status = 'published'
  AND metrics IS NOT NULL
  AND published_at > NOW() - interval '30 days'
GROUP BY type
ORDER BY avg_likes DESC;
```

### Verificar Issue no Paperclip
```
CMO receberá algo como:

## 📊 Performance das Últimas 8 Semanas (32 posts)

### Insights
- 📈 "cases_resultados" pilar tá gerando 128% mais engagement que "dicas_produtividade"
- ⭐ Posts de tipo "instagram_carousel" têm 112 engagements médios
- 🏆 designer_sondar tá liderando com 118 engagements por post

### Recomendações pra Esta Semana
- ✅ Aumentar frequência de posts "cases_resultados" — tá rendendo muito
- ⚠️ Revisar estratégia de "dicas_produtividade" — performance abaixo da média
```

---

## Cenário 3: Teste de Recomendações Específicas (15 min)

### Objetivo: Forçar diferentes tipos de recomendação

#### Recommendation: Performance Gap
```sql
-- Fazer um pilar MUITO melhor que outro
UPDATE social_posts
SET metrics = jsonb_set(metrics, '{likes}', '300'::jsonb)
WHERE pillar = 'cases_resultados'
  AND status = 'published';

UPDATE social_posts
SET metrics = jsonb_set(metrics, '{likes}', '20'::jsonb)
WHERE pillar = 'dicas_produtividade'
  AND status = 'published';
```

**Esperado na recomendação:**
```
✅ Aumentar frequência de posts "cases_resultados" — tá rendendo muito
⚠️ Revisar estratégia de "dicas_produtividade" — performance abaixo
```

#### Recommendation: Tipo favorito
```sql
-- Fazer instagram_post muito melhor que carousel
UPDATE social_posts
SET metrics = jsonb_set(metrics, '{likes}', '150'::jsonb)
WHERE type = 'instagram_post'
  AND status = 'published';

UPDATE social_posts
SET metrics = jsonb_set(metrics, '{likes}', '40'::jsonb)
WHERE type = 'instagram_carousel'
  AND status = 'published';
```

**Esperado:**
```
📱 Priorizar "instagram_post" — formato está convertendo melhor
```

---

## Cenário 4: Cross-Company Patterns (20 min)

### Setup: Posts de tipos diferentes
```sql
-- Tech content (tipo blog/linkedin)
INSERT INTO social_posts (type, status, metrics, published_at)
VALUES 
  ('blog_article', 'published', '{"likes": 200, "comments": 25}'::jsonb, NOW() - interval '1 day'),
  ('linkedin_article', 'published', '{"likes": 180, "comments": 20}'::jsonb, NOW() - interval '2 days');

-- Social content (tipo instagram)
INSERT INTO social_posts (type, status, metrics, published_at)
VALUES
  ('instagram_post', 'published', '{"likes": 80, "comments": 8}'::jsonb, NOW() - interval '1 day'),
  ('instagram_carousel', 'published', '{"likes": 75, "comments": 7}'::jsonb, NOW() - interval '2 days');
```

### Disparar e acompanhar
```bash
node bridge.mjs 2>&1 | grep "cross-company"
```

**Esperado:**
```
[briefing] 1 cross-company pattern detectado
```

### Checar padrão
Se tech >> social, output será:
```
from: "RaiseDev"
to: "AGÊNCIA MKT"
insight: "Conteúdo técnico longo tá gerando 50% mais. Considerar publicar artigos..."
```

---

## Debugging: Não Vejo Insights

### Checklist
```
1. ✅ Tem posts no social_posts?
   SELECT COUNT(*) FROM social_posts WHERE status='published' AND metrics IS NOT NULL;
   
2. ✅ Posts têm published_at nas últimas 8 semanas?
   SELECT COUNT(*) FROM social_posts 
   WHERE published_at > NOW() - interval '8 weeks' 
   AND metrics IS NOT NULL;
   
3. ✅ Métricas têm valores numéricos?
   SELECT id, metrics FROM social_posts LIMIT 1;
   
4. ✅ Bridge rodou sem erro?
   Procurar por "[evolution-err]" ou "[briefing]" nos logs
```

### Modo Verbose
```javascript
// Em bridge.mjs, adicionar isso pra debug:
if (performanceAnalysis) {
  console.log('[DEBUG]', JSON.stringify(performanceAnalysis, null, 2));
}
```

---

## Validar Qualidade dos Insights

### Insight bom:
```
- 📈 "cases_resultados" pilar tá gerando 145% mais engagement que "dicas_produtividade"
```
✅ Específico, quantificado, actionable

### Insight ruim:
```
- Performance variou
```
❌ Vago, sem número, não dá direção

### Recomendação boa:
```
✅ Aumentar frequência de posts "cases" — tá rendendo muito
```
✅ Ação específica, motivo claro

### Recomendação ruim:
```
Tentar fazer posts melhores
```
❌ Vago, não diz como

---

## Performance Monitoring

### Query Performance
```bash
# Medir tempo de análise
time node -e "
const bridge = require('./bridge.mjs');
// Vai rodar createPaperclipIssue internamente
"
```

Esperado: <1s (com 30-100 posts)

### Logs a Monitorar
```
[briefing] Analisando performance histórica...
[briefing] Adicionado: X insights + Y recomendações
[briefing] Z cross-company patterns detectados
```

---

## Test Checklist

| Aspecto | ✓ | Como Testar |
|---------|---|------------|
| Análise roda sem erro | | Logs mostram "Adicionado" |
| Insights gerados | | Seção "## 📊 Performance" aparece |
| Recomendações aparecem | | Mín 2 bullets em "Recomendações" |
| CMO recebe no Paperclip | | Issue mostra seção inteira |
| Cross-company detecta | | Logs mostram "pattern detectado" |
| Performance < 1s | | Query não trava briefing |
| Pillar analysis correto | | SELECT agrupa corretamente |
| Type analysis correto | | instagram_post vs carousel detecta |
| Agent ranking funciona | | Top agent identificado corretamente |

---

## Next Steps

### Depois de validar Phase 2:
1. ✅ Rodar com dados reais por 1 semana
2. ✅ Verificar se recomendações fazem sentido
3. ✅ Ajustar limiares (1.3x, 1.5x) se necessário
4. 🔜 Passar pra Phase 3 (Agent Forking)

### Dados pra Guardar
Salvar primeira análise pra referência:
```sql
-- Ver benchmark de primeira semana
SELECT created_at, COUNT(*), AVG((metrics->>'likes')::int)
FROM social_posts
WHERE published_at > NOW() - interval '7 days'
GROUP BY DATE(created_at);
```

---

Tá pronto? Roda o teste 1 e me diz oq aparece! 🚀
