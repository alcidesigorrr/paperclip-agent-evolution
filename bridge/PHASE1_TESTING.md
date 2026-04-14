# Phase 1: Agent Evolution Testing Guide

## O Que Foi Implementado

### 1. **Agent Memory** 🧠
Cada agente agora acumula conhecimento entre semanas:
- Padrões que funcionam (marked as "strength_pattern")
- Áreas de melhoria (marked as "improvement_area")
- Confiança cresce conforme confirmado (0-1 scale)

### 2. **Self-Evaluation** 📊
Quando agente completa uma issue:
- Claude avalia o próprio trabalho (1-10 score)
- Identifica 3 pontos fortes
- Identifica 3 pontos fracos
- Extrai 2-3 aprendizados

### 3. **Memory Context Injection** 💭
Próximo briefing que vai pro CMO já inclui:
```
## CMO_SONDAR — Aprendizados Acumulados
- client_voice: Sondar+ users respond better to ROI messaging (90% confiança)
- style: Conversação informal gerou 45% mais engagement (85% confiança)
- Última Semana: Score médio 8.2/10
```

### 4. **Weekly Performance Snapshots** 📈
Toda semana, sistema calcula:
- Score médio do agente
- Melhor ponto forte da semana
- Ponto fraco identificado
- Aprendizados acumulados

---

## Setup: Rodar a Migration

### Passo 1: Conectar ao Supabase
```bash
# Via Supabase CLI
supabase db push

# Ou via psql direto (se tiver acesso direto ao RDS)
psql postgresql://user:pass@host:port/database < bridge/migrations/20260413_agent_evolution.sql
```

### Passo 2: Verificar que as Tabelas Foram Criadas
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'agent_%';

-- Deve retornar:
-- agent_context_cache
-- agent_evaluations
-- agent_learnings
-- agent_performance_snapshot
```

### Passo 3: Iniciar o Bridge
```bash
cd /Users/igoralcides/paperclip/bridge
npm install # se primeira vez
node bridge.mjs
# ou
npm start
```

---

## Como Testar (Ciclo Completo)

### Cenário: Testar com Designer Agent

#### 1. Criar um Social Calendar Item
```sql
INSERT INTO social_calendar (week_start, week_end, plan, status)
VALUES (
  '2026-04-14',
  '2026-04-20',
  '{"briefing": "Gerar designs para semana. Foco em cases de sucesso. Use paleta Terra/Âmbar."}'::jsonb,
  'awaiting_agent'
);
```

#### 2. Disparar o Bridge
```bash
node bridge.mjs
```

**O que vai acontecer:**
1. Bridge detecta `status='awaiting_agent'`
2. Cria issue no Paperclip pra CMO
3. CMO (você) lê e delega pro Designer
4. Designer submete design (comment em JSON)

#### 3. Designer Submete Trabalho
Na issue do Paperclip, Designer comenta:
```json
{
  "type": "instagram_post",
  "title": "Case: 3x Mais Rápido com SPT",
  "caption": "Veja como nosso cliente reduziu tempo de sondagem em 66%",
  "image_description": "Before/after: SPT traditional vs Sondar+",
  "pillar": "cases_resultados",
  "hashtags": ["#SPT", "#Geotecnia", "#CasesDeSucesso"]
}
```

#### 4. Bridge Detecta Issue Completa
```bash
[timestamp] [extract] Issue abc123... concluida! Buscando posts...
[evolution] designer_sondar: Post extraído e agora será avaliado...
```

#### 5. Auto-Evaluation Roda
```bash
[evolution] ✅ designer_sondar auto-avaliou: 8.3/10
[evolution] 🧠 designer_sondar: Novo aprendizado - "strength_pattern"
  Conteúdo: "Before/after comparisons drive 2.5x more engagement"
```

#### 6. Memory Cresce
Tabela `agent_learnings`:
```
id | agent_id | category | content | confidence | source | created_at
... | designer_sondar | strength_pattern | Before/after comparisons... | 0.83 | self_evaluation | 2026-04-14...
```

#### 7. Próxima Semana: Memory é Injetado
Quando próximo briefing sai:
```
## DESIGNER_SONDAR — Aprendizados Acumulados
- strength_pattern: Before/after comparisons drive 2.5x more engagement (83% confiança)
- Última Semana: Score médio 8.3/10. Melhor em: Visual hierarchy
```

---

## Verificar Dados no Supabase

### Ver Avaliações de um Agente
```sql
SELECT agent_id, self_score, evaluation_json, created_at
FROM agent_evaluations
WHERE agent_id = 'designer_sondar'
ORDER BY created_at DESC
LIMIT 5;
```

### Ver Aprendizados Acumulados
```sql
SELECT agent_id, category, content, confidence, source
FROM agent_learnings
WHERE agent_id = 'designer_sondar'
ORDER BY confidence DESC;
```

### Ver Performance Semanal
```sql
SELECT agent_id, week_number, avg_self_score, top_strength, learned_this_week
FROM agent_performance_snapshot
ORDER BY week_number DESC
LIMIT 10;
```

---

## Debug: Logs no Console

Quando Bridge rodando, procurar por:

```
[evolution] ✅ agent_id auto-avaliou: X.X/10
  → Avaliação completada com sucesso

[evolution] 🧠 agent_id: Novo aprendizado - "category"
  → Agente aprendeu algo novo

[evolution] 📈 agent_id: Aprendizado confirmado (confiança: 0.XX)
  → Padrão se repetiu, confiança cresceu

[evolution] 📊 agent_id semana N: X.X/10 (Y tasks)
  → Performance semanal calculada
```

---

## O Que Vem Next (Phase 2)

```
Semana 2-3: Emergent Behavior
├─ CMO recebe brief com análise de performance das últimas 8 semanas
└─ Recomendações automáticas baseadas em dados

Semana 3-4: Agent Forking
├─ Sistema detecta especialização
├─ Sugere criar fork especializado
└─ CMO aprova/rejeita no admin
```

---

## Troubleshooting

### "agent_learnings table not found"
→ Migration não rodou. Execute `supabase db push` ou psql script

### "evaluateAgentWork returns null"
→ Claude não foi inicializado. Por enquanto retorna mock. Adicionar Anthropic SDK depois.

### "Memory context not appearing no briefing"
→ Verificar logs do Bridge pra `[evolution] Erro ao construir context:`

### Agente score sempre 7.5-10
→ Mock evaluation. Quando integrar Claude real, scores serão mais variados.

---

## KPIs pra Monitorar

- **Avg Self Score por Agente**: Deveria ser ~7.5-8.5 (saudável)
- **Confidence Growth**: Padrões confirmados crescem de 0.6 → 0.8 → 0.95
- **Learning Diversity**: Cada agente deve ter 10+ aprendizados diferentes (não repetir)
- **Weekly Consistency**: Score não deveria variar >2.0 semana-a-semana

---

## Próximos Passos pra Você

1. ✅ Rodar migration SQL
2. ✅ Iniciar Bridge (pedir pro Igor se quer deixar rodando local)
3. ✅ Fazer um ciclo completo com 1 agente
4. ✅ Checar dados no Supabase pra confirmar que tá salvando
5. 🔜 Phase 2: Adicionar Análise de Performance Semanal
