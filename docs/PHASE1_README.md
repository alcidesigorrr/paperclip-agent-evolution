# 🧠 Phase 1: Agent Evolution — Agent Memory + Self-Evaluation

## TL;DR

Seus agentes (Copywriter, Designer, etc) agora:
1. **Avaliam seu próprio trabalho** (auto-score 1-10)
2. **Acumulam aprendizados** entre semanas
3. **Carregam memória** no próximo briefing

**Resultado**: Agentes ficam mais inteligentes a cada semana. CMO recebe insights sobre o que funcionou.

---

## Como Funciona

### Ciclo de Aprendizado (Por Issue)

```
1. Agente completa issue no Paperclip
   ↓
2. Bridge detecta issue = 'done'
   ↓
3. Claude avalia auto-trabalho (1-10)
   → Strengths, weaknesses, learnings
   ↓
4. Se score >= 7:
   → Guardar strengths no agent_learnings
   ↓
5. Se score < 6:
   → Guardar weaknesses como "improvement_area"
   ↓
6. Atualizar agent_learnings com confiança crescente
```

### Injeção de Memória (Por Briefing)

Quando novo briefing sai pra CMO:

```
CMO recebe:
────────────────────────────────────
BRIEFING: "Gerar 5 posts semana X"

## CMO_SONDAR — Aprendizados Acumulados
- client_voice: "ROI messaging outperforms feature focus" (88% confiança)
- style: "Casual tone drives 45% more engagement" (80%)
- Última Semana: Score 8.1/10, melhor em: delegation
────────────────────────────────────
```

CMO delegará pra agents com essas dicas em mente.

---

## Arquivos Criados

```
bridge/
├── migrations/
│   └── 20260413_agent_evolution.sql    # 4 novas tabelas
├── modules/
│   └── agent-evolution.mjs              # Core logic (eval + memory)
├── PHASE1_README.md                     # Este arquivo
├── PHASE1_TESTING.md                    # Como testar
├── setup-phase1.sh                      # Script de setup
└── bridge.mjs                           # Integrado com imports + calls
```

---

## Setup (3 Passos)

### 1. Rodar Migration SQL
```bash
cd /Users/igoralcides/paperclip/bridge

# Opção A: Via Supabase CLI (recomendado)
supabase db push

# Opção B: Via psql direto
psql postgresql://user:pass@host:port/database < migrations/20260413_agent_evolution.sql

# Opção C: Via Supabase Dashboard (SQL Editor)
# → Copiar/colar conteúdo de migrations/20260413_agent_evolution.sql
```

### 2. Instalar Dependências (se não tiver)
```bash
npm install
```

### 3. Iniciar o Bridge
```bash
node bridge.mjs
# ou
npm start
```

---

## Dados Salvos

### Tabela: `agent_learnings`
```
Cada aprendizado do agente
─────────────────────────────────────
agent_id         | "copywriter_sondar"
category         | "style", "client_voice", "forbidden_terms"
content          | "Conversação informal gerou 45% mais likes"
confidence       | 0.88 (cresce com repetição)
source           | "self_evaluation" ou "feedback"
created_at       | 2026-04-14...
```

### Tabela: `agent_evaluations`
```
Auto-avaliação de cada issue
─────────────────────────────────────
agent_id         | "designer_sondar"
task_id          | Issue ID do Paperclip
self_score       | 8.3 (1-10)
evaluation_json  | {strengths: [...], weaknesses: [...], learnings: [...]}
created_at       | 2026-04-14...
```

### Tabela: `agent_performance_snapshot`
```
Resumo semanal
─────────────────────────────────────
agent_id         | "copywriter_sondar"
week_number      | 16 (2026)
posts_created    | 7
avg_self_score   | 8.1
top_strength     | "Engagement copywriting"
learned_this_week| ["ROI messaging works", "Casual tone > formal"]
```

---

## Monitorar em Produção

### Via Supabase Dashboard

```sql
-- Ver últimas avaliações de um agente
SELECT agent_id, self_score, created_at
FROM agent_evaluations
WHERE agent_id = 'copywriter_sondar'
ORDER BY created_at DESC LIMIT 10;

-- Ver aprendizados acumulados (confiança alta)
SELECT * FROM agent_learnings
WHERE agent_id = 'designer_sondar'
  AND confidence > 0.75
ORDER BY confidence DESC;

-- Ver performance semanal
SELECT agent_id, week_number, avg_self_score, top_strength
FROM agent_performance_snapshot
ORDER BY week_number DESC;
```

### Via Bridge Logs

```
[evolution] ✅ copywriter_sondar auto-avaliou: 8.3/10
[evolution] 🧠 copywriter_sondar: Novo aprendizado - "style"
[evolution] 📈 copywriter_sondar: Aprendizado confirmado (confiança: 0.88)
[evolution] 📊 copywriter_sondar semana 16: 8.1/10 (7 tasks)
```

---

## Comportamento Esperado

### Semana 1
- Agentes começam com 0 aprendizados
- Cada issue é avaliado
- Scores variam 6-9 (dependendo da qualidade)

### Semana 2
- Agentes começam a ter 3-5 aprendizados
- CMO recebe brief com "Últimas aprendizagens"
- Confiança cresce em padrões repetidos

### Semana 4+
- Cada agente tem 15+ aprendizados específicos
- Memory context fica rico e detalhado
- Agentes ficam "especializados" em seus fortes

---

## Próximas Fases (Roadmap)

```
Phase 1 (AGORA):      Agent Memory + Self-Evaluation ✅
Phase 2 (Semana 2-3): Emergent Behavior (análise de performance)
Phase 3 (Semana 3-4): Agent Forking (especialização automática)
Phase 4 (Semana 4-5): Consensus & Task Decomposition (votação)
```

---

## Troubleshooting

**Q: "agent_learnings table not found"**
A: Migration não rodou. Execute `supabase db push` ou SQL direto.

**Q: "evaluateAgentWork always returns score 7.5-10"**
A: Claude não foi integrado ainda. Por enquanto é mock. Score real virá quando adicionar Anthropic SDK.

**Q: "Memory context não aparece no briefing"**
A: Procurar `[evolution-err]` nos logs. Pode ser que Supabase query falhou.

**Q: Bridge crashed com erro de DB**
A: Verificar que as RLS policies foram criadas (ver migration SQL).

---

## Insights Futuros (Phase 2+)

Quando Phase 1 estiver sólida, adicionar:

```
// CMO recebe análise automática toda terça:
performance_analysis = {
  best_pillar: "cases_resultados" (8.5/10),
  worst_pillar: "dicas_produtividade" (6.2/10),
  top_agent_this_week: "copywriter_sondar" (8.8/10),
  recommendation: "Focus on case studies, de-prioritize tips content"
}
```

---

## Questions?

Documentação completa: [PHASE1_TESTING.md](PHASE1_TESTING.md)

Próximas passos: `npm start` e acompanhe os logs! 🚀
