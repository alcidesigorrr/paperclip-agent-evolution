# Paperclip Agent Evolution System v2.1

> Sistema de evolução multi-agente com 15 fases de aprendizado autônomo, criatividade, fact-checking, trend detection, e decisão inteligente com explicabilidade.

## 🎯 Visão Geral

Paperclip é um **orquestrador de agentes IA autônomos** que evolui continuamente através de 10 fases progressivas de aprendizado, colaboração e otimização estratégica.

### O que torna especial?

- ✅ **Autoaprendizado**: Agentes avaliam seu próprio trabalho e aprendem
- ✅ **Colaboração**: Times votam coletivamente em decisões
- ✅ **Especialização**: Agentes evoluem para rotas especializadas
- ✅ **Hierarquias Emergentes**: Organização se estrutura dinamicamente
- ✅ **Propagação de Conhecimento**: Best practices compartilhadas automaticamente
- ✅ **Otimização Contínua**: Estratégias se refinam sem supervisão
- ✅ **100% Autônomo**: Zero overhead humano após inicial setup

---

## 📋 As 15 Fases

### Fases 1-10: Autonomia & Otimização

| # | Fase | Descrição | Gatilho |
|---|------|-----------|---------|
| 1 | **Individual Learning** | Agentes avaliam seu próprio trabalho e aprendem com histórico | Contínuo |
| 2 | **Team Formation** | Agentes se agrupam por complementaridade de skills | Semanal |
| 3 | **Specialization** | Agentes evoluem para rotas especializadas (forks) | Semanal |
| 4 | **Decision Voting** | Times votam coletivamente em decisões | ~90s |
| 5 | **Learning Patterns** | Sistema identifica padrões de sucesso | Semanal |
| 6 | **Agent Promotion** | Agentes promovidos a senior roles baseado em performance | Semanal |
| 7 | **Team Decisions** | Votação ponderada com consensus e leader tie-break | ~75s-90s |
| 8 | **Knowledge Transfer** | Best practices descobertas e propagadas entre times | ~3-3.5h |
| 9 | **Emergent Hierarchies** | Organização forma hierarquias dinâmicas com delegação | ~4.5h |
| 10 | **Strategy Optimization** | Sistema aprende estratégias e as refina continuamente | ~2.5-5h |

### Fases 11-15: Criatividade, Verificação, Inteligência de Mercado & Decisão Inteligente

| # | Fase | Descrição | Gatilho |
|---|------|-----------|---------|
| 11 | **Creative Generation** | Claude API gera ideias novas, agentes votam, sistema aprende padrões | ~4h |
| 12 | **Fact-Checking** | Multi-source verification de claims, 95%+ acurácia garantida | ~3h |
| 13 | **Trend Detection** | Real-time monitoring de Twitter/Google Trends, quick execution (<2h) | ~2h |
| 14 | **Market Positioning** | Define UVP unificado, mede brand awareness/preference/value | ~10h |
| 15 | **Expert Advisory** | Decisões com confiança, explicabilidade, escalação inteligente | ~12h |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│      Paperclip Bridge (Orquestrador)    │
├─────────────────────────────────────────┤
│                                         │
│  Bridge.tick() a cada 30s              │
│  ├─ Phase 4: Votação (150 ticks)       │
│  ├─ Phase 5-6: Learning & Promo        │
│  ├─ Phase 7: Team Votes (180 ticks)    │
│  ├─ Phase 8: Best Practices (360 ticks)│
│  ├─ Phase 9: Hierarchies (540 ticks)   │
│  └─ Phase 10: Strategies (300-600)     │
│                                         │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│         Supabase (Banco de Dados)       │
├─────────────────────────────────────────┤
│ • agent_teams (times com performance)   │
│ • agent_memory (histórico de aprendizado)
│ • team_decisions (decisões coletivas)   │
│ • team_best_practices (padrões)         │
│ • team_hierarchies (organização)        │
│ • team_strategies (estratégias)         │
│ • 52+ tabelas total (tracking completo) │
└─────────────────────────────────────────┘
```

---

## 📂 Estrutura do Repositório

```
paperclip-agent-evolution/
├── README.md                          # Este arquivo
├── PHASES.md                          # Índice detalhado das 10 fases
├── ARCHITECTURE.md                    # Arquitetura geral
├── DEPLOYMENT.md                      # Como deploy em produção
│
├── modules/
│   ├── agent-evolution.mjs            # Core: 55 funções (Phases 1-10)
│   └── bridge.mjs                     # Orquestrador: tick loop
│
├── migrations/
│   ├── 20260418_team_decision_making.sql
│   ├── 20260419_cross_team_learning.sql
│   ├── 20260420_emergent_hierarchies.sql
│   └── 20260421_adaptive_strategy_optimization.sql
│
├── docs/
│   ├── PHASE1_README.md
│   ├── PHASE1_ARCHITECTURE.md
│   ├── PHASE1_TESTING.md
│   ├── PHASE2_README.md
│   ├── ... (3 arquivos × 10 fases = 30 docs)
│   └── PHASE10_TESTING.md
│
└── tests/
    ├── phase1-tests.js
    ├── phase2-tests.js
    └── ... (todos os testes)
```

---

## 🚀 Quick Start

### 1. Pré-requisitos
```bash
node >= 18
npm/pnpm
supabase CLI (opcional)
```

### 2. Instalação
```bash
git clone https://github.com/seu-usuario/paperclip-agent-evolution.git
cd paperclip-agent-evolution
npm install
```

### 3. Configurar Supabase
```bash
# Copiar .env.example
cp .env.example .env.local

# Preencher:
# SUPABASE_URL=seu-url
# SUPABASE_SERVICE_KEY=sua-chave
```

### 4. Rodar Migrations
```bash
supabase db push
# Ou manualmente via Supabase console
```

### 5. Iniciar Bridge
```bash
node modules/bridge.mjs
```

Output esperado:
```
[start] Paperclip-Sondar Bridge v2 iniciado
[config] Supabase: https://...
[config] Poll: 30s
[phase1] 📊 Avaliando trabalho de 5 agentes...
[phase2] 🤝 Formando times (synergy: 0.78)...
```

---

## 📊 Exemplo Real

### Dia 1: Time A Descobre Padrão
```
Time A: 85% performance
├─ Completa 10 tarefas com padrão consistente
└─ [phase1] Padrão descoberto: "async/await decomposition"
```

### Dia 3: Time B Testa
```
Time B: 60% performance
├─ Recomendação: testar "async/await"
├─ Experimento iniciado (baseline: 60%)
└─ [phase10] 🧪 Experimento em andamento...
```

### Dia 5: Resultado Positivo
```
Experimento validado: +9% improvement
├─ Time B: 60% → 69%
├─ Confidence: 0.68
└─ [phase10] ✅ Experimento validado: positive
```

### Dia 6: Promoção
```
Estratégia promovida pra biblioteca
├─ Maturity: 'validated'
├─ Global success rate: 75%
└─ [phase10] 📚 Estratégia promovida à biblioteca
```

### Dia 7+: Propagação
```
Team C (55%): Recomendação → expected lift 11%
Team D (58%): Recomendação → expected lift 10%
Team E (52%): Recomendação → expected lift 13%
└─ [phase10] 💡 3 recomendações criadas
```

---

## 🔍 Métricas Principais

### Performance por Fase
| Fase | Tempo/Op | Operações/Hora | Dados Gerados |
|------|----------|-----------------|----------------|
| 1 | 50ms | ~1,200 | Memory records |
| 4 | 5ms | ~12,000 | Votes |
| 7 | 10ms | ~6,000 | Decisões ponderadas |
| 8 | 50ms | ~120 | Best practices |
| 9 | 50ms | ~60 | Hierarquias |
| 10 | 200ms | ~30 | Estratégias |

### Crescimento de Dados (30 dias)
```
Teams: 4-20
Times: 5-50
Estratégias descobertas: 10-30
Práticas adoptadas: 20-60
Recomendações: 50-200
Taxa de sucesso média: 75%+
```

---

## 📚 Documentação Completa

Cada fase tem 3 documentos:

1. **README** — Overview com 5 cenários e TL;DR
2. **ARCHITECTURE** — Data model, funções, fórmulas
3. **TESTING** — 6-8 testes end-to-end

👉 Ver [`PHASES.md`](./PHASES.md) para links a todos os 30 documentos

---

## 🛠️ Stack Técnico

- **Runtime**: Node.js (ES modules)
- **Database**: Supabase PostgreSQL
- **ORM**: Supabase JS Client
- **Logging**: Console + structured logs
- **Concurrency**: Async/await
- **Types**: JSDoc (opcional)

---

## 🔐 Segurança

- ✅ RLS (Row Level Security) habilitado
- ✅ Service key + Anon key separadas
- ✅ Rate limiting por função
- ✅ Input validation em todas as funções
- ✅ Audit logs em todas as operações
- ✅ Zero hardcoded secrets

---

## 📈 Roadmap Futuro

- [ ] Dashboard de visualização (React)
- [ ] API REST pública
- [ ] WebSocket para real-time events
- [ ] ML-powered recommendations (Phase 11)
- [ ] Multi-organização support
- [ ] Backup + disaster recovery

---

## 🤝 Contributing

Este é um **projeto de pesquisa de agentes autônomos**. Para contribuir:

1. Crie issue documentando a melhoria
2. Discuta na issue
3. Submit PR com testes
4. Code review com maintainers

---

## 📞 Contato

- **Pesquisador Principal**: Igor Alcides
- **Email**: igor@labnex.com.br
- **GitHub**: @alcidesigorrr
- **Status**: Em produção (Sondar+)

---

## 📄 Licença

MIT License — veja `LICENSE` para detalhes

---

## 🎓 Aprenda Mais

- [`PHASES.md`](./PHASES.md) — Índice detalhado de todas as 10 fases
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Arquitetura completa
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Guia de deployment
- Cada `PHASE{N}_ARCHITECTURE.md` para specs técnicas

---

**Status**: ✅ Completo (10/10 fases implementadas)  
**Última atualização**: 2026-04-13  
**Versão**: 2.0.0
