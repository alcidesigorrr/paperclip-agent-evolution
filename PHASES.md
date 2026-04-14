# Índice de Fases — Paperclip Agent Evolution

## 📋 As 10 Fases em Detalhes

### Phase 1: Individual Learning
**Descrição**: Cada agente avalia seu próprio trabalho e aprende com performance histórica.

**Documentação**:
- [PHASE1_README.md](./docs/PHASE1_README.md) — Overview com cenários
- [PHASE1_ARCHITECTURE.md](./docs/PHASE1_ARCHITECTURE.md) — Data model e funções
- [PHASE1_TESTING.md](./docs/PHASE1_TESTING.md) — Testes

**Funções**: `evaluateAgentWork`, `updateAgentMemory`, `buildAgentMemoryContext`, `calculateWeeklyPerformance`, `analyzePerformanceHistory`

**Gatilho**: Contínuo (cada feedback registrado)

---

### Phase 2: Team Formation
**Descrição**: Agentes se agrupam por complementaridade de skills em times coesos.

**Documentação**:
- [PHASE2_README.md](./docs/PHASE2_README.md)
- [PHASE2_ARCHITECTURE.md](./docs/PHASE2_ARCHITECTURE.md)
- [PHASE2_TESTING.md](./docs/PHASE2_TESTING.md)

**Funções**: `formTeam`, `evaluateTeamPerformance`, `analyzeAgentSynergy`

**Gatilho**: Semanal (~7 dias)

---

### Phase 3: Specialization
**Descrição**: Agentes evoluem para rotas especializadas com instruções customizadas (forks).

**Documentação**:
- [PHASE3_README.md](./docs/PHASE3_README.md)
- [PHASE3_ARCHITECTURE.md](./docs/PHASE3_ARCHITECTURE.md)
- [PHASE3_TESTING.md](./docs/PHASE3_TESTING.md)

**Funções**: `detectSpecializationOpportunities`, `createAgentFork`, `saveForkSuggestion`, `approveForkSuggestion`

**Gatilho**: Semanal com aprovação

---

### Phase 4: Decision Voting
**Descrição**: Agentes votam coletivamente em decisões críticas com pesos baseados em expertise.

**Documentação**:
- [PHASE4_README.md](./docs/PHASE4_README.md)
- [PHASE4_ARCHITECTURE.md](./docs/PHASE4_ARCHITECTURE.md)
- [PHASE4_TESTING.md](./docs/PHASE4_TESTING.md)

**Funções**: `createDecisionPoint`, `recordAgentVote`, `aggregateVotes`, `getAgentVotingAccuracy`

**Gatilho**: ~90 segundos (30 ticks em tick loop)

---

### Phase 5: Learning Patterns
**Descrição**: Sistema identifica padrões de sucesso, skills emergentes e oportunidades de crescimento.

**Documentação**:
- [PHASE5_README.md](./docs/PHASE5_README.md)
- [PHASE5_ARCHITECTURE.md](./docs/PHASE5_ARCHITECTURE.md)
- [PHASE5_TESTING.md](./docs/PHASE5_TESTING.md)

**Funções**: `discoverLearningPatterns`, `updateAgentSkills`, `generateRecommendations`, `detectPerformanceDegradation`

**Gatilho**: Semanal

---

### Phase 6: Agent Promotion
**Descrição**: Agentes são promovidos a senior roles e liderança baseado em performance contínua.

**Documentação**:
- [PHASE6_README.md](./docs/PHASE6_README.md)
- [PHASE6_ARCHITECTURE.md](./docs/PHASE6_ARCHITECTURE.md)
- [PHASE6_TESTING.md](./docs/PHASE6_TESTING.md)

**Funções**: `promoteAgent`, `rebuildOrganizationStructure`, `getOrganizationChart`

**Gatilho**: Semanal com validação

---

### Phase 7: Team Decisions
**Descrição**: Times votam em decisões críticas com consensus ponderado e tie-break por leader.

**Documentação**:
- [PHASE7_README.md](./docs/PHASE7_README.md)
- [PHASE7_ARCHITECTURE.md](./docs/PHASE7_ARCHITECTURE.md)
- [PHASE7_TESTING.md](./docs/PHASE7_TESTING.md)

**Funções**: `createTeamDecision`, `recordTeamVote`, `aggregateTeamVotes`, `leaderBreaksTie`, `recordDecisionOutcome`

**Gatilho**: 150 ticks (~75s) para votação, 180 ticks (~90s) para resolução

**Data Model**: 6 tabelas (decisions, votes, consensus, impact, history, events)

---

### Phase 8: Knowledge Transfer
**Descrição**: Best practices são descobertas de times de alta performance e propagadas automaticamente.

**Documentação**:
- [PHASE8_README.md](./docs/PHASE8_README.md)
- [PHASE8_ARCHITECTURE.md](./docs/PHASE8_ARCHITECTURE.md)
- [PHASE8_TESTING.md](./docs/PHASE8_TESTING.md)

**Funções**: `discoverBestPractices`, `proposeKnowledgeTransfer`, `adoptPractice`, `measureAdoptionImpact`

**Gatilho**: 360 ticks (~3h) para discovery, 420 ticks (~3.5h) para transfer

**Data Model**: 6 tabelas (practices, transfer, adoption, impact, networks, events)

---

### Phase 9: Emergent Hierarchies
**Descrição**: Organização forma hierarquias dinâmicas com delegação de autoridade baseada em performance.

**Documentação**:
- [PHASE9_README.md](./docs/PHASE9_README.md)
- [PHASE9_ARCHITECTURE.md](./docs/PHASE9_ARCHITECTURE.md)
- [PHASE9_TESTING.md](./docs/PHASE9_TESTING.md)

**Funções**: `formTeamHierarchy`, `escalateDecision`, `allocateResources`, `rebuildHierarchy`

**Gatilho**: 540 ticks (~4.5h) para rebuild

**Data Model**: 7 tabelas (hierarchies, authority, allocation, escalations, metrics, competence, events)

**Authority Formula**:
```
total_authority = min(1.0,
  base_authority (0.3-0.8)
  + performance_authority (0.0-0.3)
  + seniority_authority (0.0-0.15)
  + delegation_authority (0.0-0.7)
)
```

---

### Phase 10: Strategy Optimization
**Descrição**: Sistema aprende estratégias bem-sucedidas e as propaga automaticamente com otimização contínua.

**Documentação**:
- [PHASE10_README.md](./docs/PHASE10_README.md)
- [PHASE10_ARCHITECTURE.md](./docs/PHASE10_ARCHITECTURE.md)
- [PHASE10_TESTING.md](./docs/PHASE10_TESTING.md)

**Funções**: `discoverTeamStrategies`, `experimentWithStrategy`, `validateStrategyExperiment`, `promoteStrategyToLibrary`, `recommendStrategiesByContext`, `analyzeStrategySynergies`, `optimizeOrganizationStrategy`

**Gatilho**:
- 300 ticks (~2.5h) — Descoberta
- 360 ticks (~3h) — Experimentação
- 420 ticks (~3.5h) — Validação
- 480 ticks (~4h) — Otimização
- 600 ticks (~5h) — Propagação

**Data Model**: 9 tabelas (strategies, experiments, history, library, combinations, recommendations, adaptations, health, events)

---

## 📊 Tabelas por Fase

| Fase | Tabelas | Total |
|------|---------|-------|
| 1-6 | 16 tabelas (agentes, memoria, fork, skills) | 16 |
| 7 | 6 tabelas (team decisions) | 6 |
| 8 | 6 tabelas (best practices) | 6 |
| 9 | 7 tabelas (hierarchies) | 7 |
| 10 | 9 tabelas (strategies) | 9 |
| **Total** | | **52** |

---

## ⏱️ Ciclos de Execução

```
Tick Loop (30s cada)
├─ A cada 150 ticks (~75s)     → Phase 4: Votação
├─ A cada 180 ticks (~90s)     → Phase 7: Resolução de votos
├─ A cada 300 ticks (~2.5h)    → Phase 10: Descoberta
├─ A cada 360 ticks (~3h)      → Phase 8+10: Best practices + Experimentos
├─ A cada 420 ticks (~3.5h)    → Phase 8+10: Transfer + Validação
├─ A cada 480 ticks (~4h)      → Phase 10: Otimização
├─ A cada 540 ticks (~4.5h)    → Phase 9: Reconstrução de hierarquias
└─ A cada 600 ticks (~5h)      → Phase 10: Propagação

Semanal
├─ Phase 2: Team Formation
├─ Phase 3: Specialization
├─ Phase 5: Learning Patterns
└─ Phase 6: Agent Promotion
```

---

## 🎯 Progressão do Sistema

```
Week 1: Fases 1-2
  Agentes começam a aprender e formar times

Week 2-3: Fases 3-5
  Especialização emerge, padrões identificados

Week 4: Fases 6-7
  Promoção de líderes, votação estruturada

Week 5-6: Fases 8-9
  Conhecimento compartilhado, hierarquias formadas

Week 7+: Phase 10
  Sistema aprende estratégias e evolui continuamente
```

---

## 📚 Arquivo de Funções

**Total**: 55 funções exportadas

### Phase 1-6 (30 funções)
```javascript
evaluateAgentWork
updateAgentMemory
buildAgentMemoryContext
calculateWeeklyPerformance
detectSpecializationOpportunities
analyzePerformanceHistory
generatePerformanceInsights
buildPerformanceBriefing
analyzeCrossCompanyPatterns
analyzeAgentPerformanceByCategory
buildRefinedInstructions
createAgentFork
saveForkSuggestion
getPendingForkSuggestions
approveForkSuggestion
rejectForkSuggestion
createDecisionPoint
recordAgentVote
aggregateVotes
decomposeComplexTask
getAgentVotingAccuracy
updateVotingAccuracy
submitFeedbackResult
discoverLearningPatterns
detectPerformanceDegradation
updateAgentSkills
generateRecommendations
getAgentLearningContext
analyzeAgentSynergy
formTeam
evaluateTeamPerformance
promoteAgent
dissolveTeam
rebuildOrganizationStructure
getOrganizationChart
```

### Phase 7-9 (18 funções)
```javascript
createTeamDecision
recordTeamVote
aggregateTeamVotes
leaderBreaksTie
recordDecisionOutcome
discoverBestPractices
proposeKnowledgeTransfer
adoptPractice
measureAdoptionImpact
formTeamHierarchy
escalateDecision
allocateResources
rebuildHierarchy
```

### Phase 10 (7 funções)
```javascript
discoverTeamStrategies
experimentWithStrategy
validateStrategyExperiment
promoteStrategyToLibrary
recommendStrategiesByContext
analyzeStrategySynergies
optimizeOrganizationStrategy
```

---

## 🚀 Começar por Onde?

### Para Entender o Sistema:
1. Leia [README.md](./README.md) para visão geral
2. Leia [ARCHITECTURE.md](./ARCHITECTURE.md) para entender dados
3. Leia [PHASE1_README.md](./docs/PHASE1_README.md) a [PHASE10_README.md](./docs/PHASE10_README.md) em ordem

### Para Implementar:
1. Veja [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Rode migrations em ordem (Phase 7-10)
3. Inicie `bridge.mjs`

### Para Testar:
1. Leia cada `PHASE{N}_TESTING.md`
2. Execute testes em ordem
3. Monitore logs com prefixo `[phase{N}]`

---

**Última atualização**: 2026-04-13  
**Status**: Completo (10/10 fases)
