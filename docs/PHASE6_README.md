# 🏢 Phase 6: Dynamic Company Structure — Equipes Emergentes e Hierarquias

## TL;DR

Seu sistema agora:
1. **Detecta sinergia** entre agentes (quem trabalha bem junto)
2. **Forma times** baseado em performance + complementaridade
3. **Promove agentes** pra roles melhores (specialist → leader)
4. **Dissolve times** que não tão funcionando (< 50% performance)
5. **Reorganiza estrutura** toda semana baseado em dados reais
6. **Gera organograma** dinâmico que muda com performance

**Resultado**: Organização emerge naturalmente. Melhor agentes automaticamente em liderança. Times fracos se dissolvem. Estrutura é fluida, não rígida.

---

## Como Funciona

### Cenário 1: Detectar Sinergia

```
copywriter_sondar + designer_sondar trabalham juntos:
  - Copywriter: 85% avg performance
  - Designer: 88% avg performance
  - Skills complementares: copywriting vs design
    ↓
analyzeAgentSynergy():
  Synergy Score = 0.82 (muito bom!)
  "São um bom match"
    ↓
Resultado:
  - agent_synergy.synergy_score: 0.82
  - total_collaborations: 1
    ↓
System recomenda: "Colocar juntos no mesmo time"
```

### Cenário 2: Formar Time

```
High synergy entre 2-3 agentes:
  copywriter_sondar (80% perf) + designer_sondar (88% perf)
  → synergy 0.82
    ↓
formTeam("copywriter_designer_team"):
  - Líder: copywriter_sondar
  - Especialista: designer_sondar
  - Propósito: "High-quality content with visuals"
  - Specialization: {pillar: "cases"}
    ↓
Time criado:
  - agent_teams table: 1 nova linha
  - agent_roles: 2 roles (leader, specialist)
    ↓
CMO vê no briefing:
  "🏢 Novo time formado: copywriter_designer_team
   Líder: copywriter_sondar
   Membros: designer_sondar"
```

### Cenário 3: Time Bom → Promove Leader

```
Time "copywriter_designer_team":
  - Formado faz 2 semanas
  - Performance: 89% (muito bom)
    ↓
evaluateTeamPerformance():
  - Avg feedback: 89%
  - performanceScore: 0.89 → EXCELENTE
    ↓
promoteAgent(copywriter_sondar, "senior_lead", team_id):
  - Antigas role: "leader"
  - Nova role: "senior_lead"
  - Reason: "Performance 89%"
    ↓
Agent promovido:
  - agent_roles.role_name: "senior_lead"
  - agent_promotions: nova entrada
    ↓
CMO vê:
  "⬆️ copywriter_sondar promovido: leader → senior_lead
   89% performance, pronto pra operações maiores"
```

### Cenário 4: Time Fraco → Dissolve

```
Time "experimental_team":
  - Formado faz 4 semanas
  - Performance: 42% (muito ruim)
    ↓
evaluateTeamPerformance():
  - Avg feedback: 42%
  - performanceScore: 0.42 → ALERTA
    ↓
rebuildOrganizationStructure():
  - "Time performance 42% < 50% threshold"
  - dissolveTeam("experimental_team", "Performance too low")
    ↓
Time dissolvido:
  - agent_teams.is_active: false
  - agent_roles deativadas
  - structure_events: "team_dissolved"
    ↓
CMO vê:
  "💔 Time dissolvido: experimental_team
   Razão: Performance 42%
   Agentes voltam pra pool geral"
```

### Cenário 5: Reorganizar Tudo

```
Bridge roda rebuildOrganizationStructure() a cada 4 horas:
  1. Avalia todos os times:
     - "copywriter_designer_team": 89% ✅
     - "experimental_team": 42% ❌ → DISSOLVE
     - "strategy_team": 65% ⚠️

  2. Forma novos times baseado em sinergia:
     - copywriter_sondar ↔ content_creator: 0.78
     → Forma "content_strategy_team"
     
  3. Promove agentes com 80%+ performance
  
  4. Cria organograma com estrutura emergente
    ↓
Resultado: Organização se reorganiza dinamicamente
  - Fracassados desaparecem
  - Bem-sucedidos crescem
  - Novas combinações são experimentadas
  - Estrutura é fluida
```

---

## O Que Muda

### Novas Tabelas
```sql
agent_teams:              -- times formados dinamicamente
  team_name, leader_id, members (JSONB), performance_score, is_active

agent_roles:              -- papéis dentro de times
  agent_id, team_id, role_name, success_rate

agent_synergy:            -- medida de compatibilidade
  agent_a_id, agent_b_id, synergy_score, collaborations

organizational_hierarchy: -- estrutura em árvore
  hierarchy_level, parent_unit, unit_id, authority_level

agent_promotions:         -- histórico de promoções
  agent_id, old_role, new_role, reason, effectiveness_increase
```

### Novas Funções
```javascript
analyzeAgentSynergy(agentA, agentB)
  → Calcula sinergia (0-1): (performance + complementaridade)

formTeam(name, leader, members, specialization)
  → Cria time, designa roles
  
evaluateTeamPerformance(teamId)
  → Calcula avg performance do time
  → Atualiza performance_score
  
promoteAgent(agentId, newRole, teamId)
  → Upgrade agente pra role melhor
  → Loga histórico
  
dissolveTeam(teamId, reason)
  → Deativa time + roles
  → Loga razão
  
rebuildOrganizationStructure()
  → Avalia todos times
  → Dissolve fracos
  → Forma novos
  → Promove stars
  
getOrganizationChart()
  → Retorna markdown com org tree
```

---

## Exemplos

### Antes Phase 6
```
Agentes isolados:
  - copywriter_sondar (independente)
  - designer_sondar (independente)
  - content_creator_sondar (independente)
  
CMO manualmente atribui tarefas
"Vocês vão trabalhar juntos neste projeto"
```

### Depois Phase 6
```
Organização emergente:

🏢 copywriter_designer_team (89% performance)
  └─ copywriter_sondar (senior_lead)
  └─ designer_sondar (specialist)

🏢 content_strategy_team (75% performance)
  └─ content_creator_sondar (lead)
  └─ social_media_manager_sondar (specialist)

🤝 High Synergy Pairs (potential teams):
  - copywriter_sondar ↔ designer_sondar (0.82)
  - content_creator ↔ cmo_sondar (0.78)

Times são formados, desfeitos, reorganizados
automaticamente baseado em real performance
```

---

## Dados

### agent_teams table
```sql
team_name         | leader_id           | performance_score | is_active
------------------|---------------------|-------------------|----------
copywriter_design | copywriter_sondar   | 0.89              | true
experimental      | designer_sondar     | 0.42              | false
strategy_team     | content_creator     | 0.65              | true
```

### agent_synergy table
```sql
agent_a_id        | agent_b_id         | synergy_score | collaborations
------------------|-------------------|---------------|---------------
copywriter_sondar | designer_sondar    | 0.82          | 5
copywriter_sondar | content_creator    | 0.71          | 3
designer_sondar   | social_media_mgr   | 0.68          | 2
```

### agent_roles table
```sql
agent_id          | team_id | role_name     | success_rate
------------------|---------|---------------|-------------
copywriter_sondar | team-1  | senior_lead   | 0.89
designer_sondar   | team-1  | specialist    | 0.88
content_creator   | team-2  | lead          | 0.75
```

---

## Bridge Integration

```javascript
// A cada 480 ticks (~4 horas):
if (tickCount % 480 === 0) {
  await rebuildStructure();
}

rebuildStructure():
  ├─ Avalia todos times ativos
  ├─ Dissolve se perf < 50%
  ├─ Forma novos baseado em synergy
  └─ Promove agentes high-perf
```

---

## Next Steps

### Phase 6B (Dashboard):
1. Org chart visualization
   - Tree view de times
   - Performance indicators
   - Synergy network graph

2. Team management UI
   - Create/dissolve teams
   - Reassign members
   - View roles + promotions

### Depois:
- **Phase 7**: Consensus on Team Decisions (times votam juntos)
- **Phase 8**: Cross-Team Learning (times aprendem um do outro)

---

Tá pronto? Vamo testar Phase 6! 🚀
