# 📊 Phase 2: Emergent Behavior — Auto-Analysis + Smart Recommendations

## TL;DR

Seu Bridge agora:
1. **Analisa 8 semanas de performance** passada (qual pilar rende mais)
2. **Gera 3 insights + 2 recomendações** automáticas
3. **Injeta no briefing do CMO** ANTES dele começar a semana
4. **Detecta padrões cross-company** (RaiseDev ↔ AGÊNCIA MKT)

**Resultado**: CMO recebe contexto rico sobre o que funcionou. Não precisa adivinhar. Data-driven.

---

## Como Funciona

### Novo Fluxo (Por Semana)

```
CMO vai criar novo briefing
   ↓
Bridge.createPaperclipIssue() é chamado
   ↓
[PHASE 1] Injeta memory context do CMO (aprendizados)
   ↓
[PHASE 2] ⭐ NEW: Analisa últimos 8 semanas de posts publicados
   ├─ Grupo por pilar: qual "cases", "dicas", etc
   ├─ Grupo por tipo: qual "instagram_post" vs "carousel" vs "blog"
   ├─ Grupo por agente: qual "copywriter", "designer", etc
   ↓
[PHASE 2] Gera insights
   ├─ "Cases pilar tá 45% melhor que Tips"
   ├─ "Instagram posts convertem 60% melhor que carousels"
   ├─ "Designer_sondar liderando com 120 likes/post"
   ↓
[PHASE 2] Gera recomendações
   ├─ "✅ Aumentar frequência de cases — tá rendendo"
   ├─ "⚠️ Revisar dicas — performance abaixo da média"
   ├─ "📱 Priorizar posts simples (não carousels)"
   ↓
[PHASE 2] CMO recebe briefing com tudo isso injetado
   ↓
CMO delega pra agents COM ESSAS DICAS
```

---

## Exemplos de Insights Gerados

### Exemplo 1: Performance por Pilar
```
Performance das últimas 8 semanas (32 posts)

### Insights
- 📈 "cases_resultados" pilar tá gerando 145% mais engagement 
  que "dicas_produtividade"
- ⭐ Posts de tipo "instagram_post" têm 85 engagements médios
- 🏆 copywriter_sondar tá liderando com 92 engagements por post

### Recomendações pra Esta Semana
- ✅ Aumentar frequência de posts "cases" — tá rendendo muito
- 📱 Priorizar "instagram_post" simples — formato está convertendo melhor
```

### Exemplo 2: Post Tipo
```
### Insights
- 📈 "instagram_carousel" tá com 3.2x mais comments que "instagram_post"
- Copywriter's case studies averaging 120 likes
- Blog articles getting 0 engagement (network issue?)

### Recomendações
- ⚠️ Revisar estratégia de Blog — performance abaixo
- 📱 Aumentar carousels com 3-5 slides
```

### Exemplo 3: Agent Performance
```
### Insights
- 🏆 designer_sondar leading with 135 avg engagement
- copywriter_sondar: 98 avg (consistent)
- social_media_manager_sondar: needs improvement (62 avg)

### Recomendações
- Usar templates do designer_sondar pra outros
- Treinar social_media_manager em copy
```

---

## O Que Mudou no Código

### Nova Tabela Usada (Phase 1)
```sql
social_posts (tabela existente)
  ├─ type: "instagram_post", "carousel", "blog_article"
  ├─ pillar: "cases_resultados", "dicas_produtividade", etc
  ├─ metrics: { likes, comments, shares, reach, etc }
  ├─ paperclip_agent: qual agente criou
  └─ published_at: quando foi publicado
```

### Novas Funções (agent-evolution.mjs)
```javascript
analyzePerformanceHistory(companyPillar, weeksBack)
  → { totalPosts, timeRange, performance: {pillar, type, agent} }

generatePerformanceInsights(analysis)
  → { insights: [...], recommendations: [...] }

buildPerformanceBriefing(insightsData)
  → "## 📊 Performance...\n### Insights\n..."

analyzeCrossCompanyPatterns()
  → [{ from, to, insight }, ...]
```

### Chamadas no Bridge
```javascript
// Em createPaperclipIssue():
const performanceAnalysis = await analyzePerformanceHistory('sondar', 8);
const insights = await generatePerformanceInsights(performanceAnalysis);
const performanceBriefing = await buildPerformanceBriefing(insights);
briefing = briefing + performanceBriefing;
```

---

## Setup

✅ **Nenhum setup adicional!**

Phase 2 usa dados que já estão no Supabase (social_posts com metrics).

Só iniciar o Bridge:
```bash
node bridge.mjs
```

Próximo briefing que sair, vai incluir análise automática.

---

## Monitorar em Produção

### Logs que Você Verá
```
[briefing] Analisando performance histórica...
[briefing] Adicionado: 3 insights + 2 recomendações
[briefing] 2 cross-company patterns detectados
```

### Checar Dados no Supabase
```sql
-- Ver posts com metrics (pra Phase 2 funcionar)
SELECT id, type, pillar, metrics, published_at
FROM social_posts
WHERE metrics IS NOT NULL
  AND published_at > now() - interval '8 weeks'
ORDER BY published_at DESC
LIMIT 20;

-- Agregar por pilar
SELECT pillar, COUNT(*) as total, 
  AVG((metrics->>'likes')::int) as avg_likes
FROM social_posts
WHERE status = 'published'
  AND metrics IS NOT NULL
GROUP BY pillar;
```

---

## Comportamento Esperado

### Semana 1 (Phase 2 ligada)
- Briefing ainda sem insights (poucos posts publicados)
- Logs mostram "0 posts publicados"

### Semana 2-4
- Briefing começa a mostrar insights
- CMO vê padrões (qual pilar rende mais)
- Recomendações guiam delegação

### Semana 8+
- Dados ricos (32+ posts)
- Insights muito específicos
- Cross-company patterns aparecem

---

## Troubleshooting

**Q: "Sem posts publicados nos últimos 8 semanas"**
A: Poucos posts foram marcados como 'published' com metrics.
   Confirmar que social_posts tá com metrics populado via:
   ```sql
   SELECT COUNT(*) FROM social_posts WHERE metrics IS NOT NULL;
   ```

**Q: Insights aparecem, mas recomendações vazias**
A: Variância de performance é pequena (todos os pillars rendendo igual).
   Quando houver diferença significativa (1.3x ou 1.5x), recomendações aparecem.

**Q: Cross-company patterns nunca aparecem**
A: Função tá rodando mas insights não são persistidos (log only).
   Phase 3 vai guardar essas patterns.

---

## Próximos Passos

### Phase 2 está completa quando:
✅ Bridge logando "Adicionado X insights + Y recomendações"
✅ Briefing incluindo seção "## 📊 Performance das Últimas 8 Semanas"
✅ CMO recebendo dados em português claro

### Próxima Fase (Phase 3):
```
Agent Forking
├─ Detectar quando agente tem 2-3x variância em pilar
├─ Sugerir: "Criar copywriter_cases_specialist?"
├─ Sistema cria fork com instructions refinadas
└─ Novo agente especializado resolve problema
```

---

## Notes

- Phase 2 é **leitura-only** — não modifica dados
- Análise roda **toda vez que novo briefing é criado**
- Performance query leva ~500ms (8 weeks, 30+ posts)
- Mock Claude evaluation ainda rodando (scores não afetam análise)

---

## Questions?

Testa um ciclo completo:
1. Ter alguns posts publicados no Supabase
2. Criar novo `social_calendar` com `status='awaiting_agent'`
3. Bridge cria briefing e você vê os logs de Phase 2
4. Abre a issue no Paperclip e vê a seção "## 📊 Performance..."

Ready? 🚀
