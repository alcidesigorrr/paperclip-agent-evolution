# 🌳 Phase 9: Emergent Hierarchies — Hierarquias Dinâmicas

## TL;DR

Seu sistema agora:
1. **Forma hierarquias** entre times (senior → junior)
2. **Delega autoridade** baseado em performance
3. **Escala decisões** quando necessário
4. **Aloca recursos** entre times
5. **Mede competência de liderança** de cada time
6. **Reconstrói hierarquia** automaticamente a cada 4-5 horas

**Resultado**: Hierarquia emerge naturalmente. Times de alta performance supervisionam outros. Decisão escalada quando necessário. Organização fica multi-nível, fluida.

---

## Como Funciona

### Cenário 1: Formar Hierarquia

```
Times na organização:
  - copywriter_designer_team: 89% perf ⭐
  - strategy_team: 72% perf
  - content_team: 65% perf
  - experimental_team: 40% perf ❌
    ↓
formTeamHierarchy():
  parent: copywriter_designer_team (89%)
  child: strategy_team (72%)
  Check: parent perf > 75%? ✓
    ↓
Hierarquia formada:
  - team_hierarchies criada
  - hierarchy_level: 2 (parent=1, child=2)
  - relationship_type: 'supervision'
  - authority_delegation: 0.65 (child tem 65% autonomia)
    ↓
team_authority_levels:
  - copywriter_designer: base_authority=0.8, seniority=0.15
  - strategy_team: base_authority=0.5, delegation=0.65
    ↓
CMO vê:
  "🏛️ Hierarquia formada:
   copywriter_designer (SENIOR) → strategy_team (JUNIOR)
   strategy_team tem 65% autonomia pro dia-a-dia"
```

### Cenário 2: Escalação de Decisão

```
strategy_team votando em decisão complexa:
  Tema: "Pivoted product strategy?"
  Complexidade: 9/10
  → Acima do threshold (7/10) do time
    ↓
escalateDecision():
  source_team: strategy_team
  parent_team: copywriter_designer_team (obtém via hierarchy)
  decision_id: d123
  escalation_reason: "complexity_exceeded"
  escalation_urgency: 9
    ↓
team_decision_escalations criada:
  - source_team_id: strategy_team
  - parent_team_id: copywriter_designer_team
  - status: "pending"
    ↓
Fluxo:
  strategy_team: "Decisão é complexa, escalando"
  copywriter_designer_team: "Recebemos escalação de strategy_team"
  → Leader do parent time toma decisão final
    ↓
CMO vê:
  "📤 Escalação: strategy_team → copywriter_designer
   Razão: Complexidade 9/10 (acima limiar)
   Aguardando aprovação de parent leader"
```

### Cenário 3: Alocação de Recursos

```
copywriter_designer_team (senior) tem expertise em:
  - Colaboração high-synergy
  - Iteração rápida

strategy_team (junior) precisa:
  - Treinamento em padrão de colaboração
  - 20 horas de consultoria
    ↓
allocateResources():
  from_team: copywriter_designer_team
  to_team: strategy_team
  resource_type: 'specialist_time'
  quantity: 20
  unit: 'hours'
  justification: "Treinamento em High Synergy pattern"
    ↓
team_resource_allocation criada:
  - from_team_id: copywriter_designer
  - to_team_id: strategy_team
  - quantity: 20
  - status: 'pending' (aguardando aprovação)
    ↓
Fluxo:
  copywriter_designer: "Alocamos 20h pro treinamento"
  strategy_team: "Recebemos 20h de consultoria"
  → Após execution, mede impacto (performance melhorou?)
    ↓
CMO vê:
  "💼 Alocação: copywriter_designer → strategy_team
   Recurso: 20 horas de specialist_time
   Objetivo: Treinamento em colaboração"
```

### Cenário 4: Dinâmica Hierárquica

```
Semana 1: Hierarquia formada
  copywriter_designer (89%) → strategy_team (72%)
  
Semana 2: strategy_team melhora (72% → 78%)
  → Authority_delegation pode aumentar pra 0.75
  → Menos escalações necessárias
  
Semana 3: strategy_team chega 82%
  → Pronto pra ser parent? Não ainda (precisa 85%+)
  → Mas agora supervisiona content_team (65%)
  
Semana 4: Reorganização automática
rebuildHierarchy():
  1. Top 20% viram tier 1 (seniors)
  2. Outros 80% distribuídos sob seniors
  3. Atualiza authority baseado em performance
    ↓
Hierarquia evoluiu:
  Tier 1 (SENIOR):        copywriter_designer (89%)
                          strategy_team (82%)
  
  Tier 2 (JUNIOR):        content_team (65%)
                          experimental_team (40%)
```

### Cenário 5: Competência de Liderança

```
copywriter_designer_team como parent:
  - Faz decisões de qualidade ✓
  - Membros satisfeitos (4.5/5)
  - Resolve conflitos bem (0.85)
  - Pensa estrategicamente (0.8)
  - Delega bem (0.75)
  
team_leadership_competence:
  - decision_quality_score: 0.87
  - member_satisfaction: 4.5
  - conflict_resolution: 0.85
  - strategic_thinking: 0.8
  - delegation_ability: 0.75
  - readiness_for_greater_authority: 0.82
    ↓
Sistema detecta:
  "Este time está pronto pra autoridade ainda maior"
  → Pode gerenciar múltiplos subordinados
  → Pode tomar decisões mais estratégicas
    ↓
CMO vê:
  "🎖️ Leadership competence de copywriter_designer:
   Qualidade de decisão: 87%
   Satisfação de membros: 4.5/5
   Pronto pra maior autoridade? SIM (82%)"
```

---

## O Que Muda

### Novas Tabelas
```sql
team_hierarchies:            -- relação pai-filho entre times
  parent_team_id, child_team_id, hierarchy_level, authority_delegation

team_authority_levels:       -- capacidade de decisão
  team_id, base_authority, performance_authority, delegation_authority

team_resource_allocation:    -- movimento de recursos
  from_team_id, to_team_id, resource_type, quantity, status

team_decision_escalations:   -- escalação de decisão
  source_team_id, parent_team_id, decision_id, escalation_reason

team_hierarchy_metrics:      -- saúde da hierarquia
  team_id, hierarchy_depth, subordinate_teams, autonomy_ratio

team_leadership_competence:  -- avaliação de liderança
  team_id, leadership_style, decision_quality_score

team_hierarchy_events:       -- auditoria
  event_type, parent_team_id, child_team_id
```

### Novas Funções
```javascript
formTeamHierarchy(parentTeamId, childTeamId)
  → Cria relação supervisor-subordinado

escalateDecision(childTeamId, decisionId)
  → Envia decisão complexa pro parent

allocateResources(fromTeamId, toTeamId, resourceType, quantity)
  → Move recursos entre times

rebuildHierarchy()
  → Reconstrói toda a hierarquia
```

---

## Dados

### team_hierarchies table
```sql
parent_team_id | child_team_id      | hierarchy_level | authority_delegation
---------------|-------------------|-----------------|-------------------
team-1         | team-2             | 1               | 0.65
team-2         | team-3             | 2               | 0.5
```

### team_authority_levels table
```sql
team_id | base_authority | performance_authority | total_authority
--------|----------------|----------------------|----------------
team-1  | 0.8            | 0.15                 | 0.95
team-2  | 0.5            | 0.08                 | 0.58
```

### team_decision_escalations table
```sql
source_team_id | parent_team_id | decision_id | escalation_urgency | status
---------------|----------------|-------------|-------------------|--------
team-2         | team-1         | d1          | 9                  | pending
```

### team_leadership_competence table
```sql
team_id | decision_quality | member_satisfaction | readiness_for_greater_authority
--------|------------------|---------------------|------------------------------
team-1  | 0.87             | 4.5                 | 0.82
team-2  | 0.65             | 3.8                 | 0.58
```

---

## Bridge Integration

```javascript
// A cada 540 ticks (~4.5 horas):
if (tickCount % 540 === 0) {
  await rebuildTeamHierarchy();
}

rebuildTeamHierarchy():
  ├─ Identifica top 20% (tier 1)
  ├─ Forma hierarquias parent-child
  ├─ Distribui outros times
  ├─ Atualiza authority levels
  └─ Log resultado
```

---

## Exemplo de Evolução

```
DIA 1: Organização linear, sem hierarquia
  All teams = same level

SEMANA 2: Performance começa a divergir
  copywriter_designer: 89%
  strategy_team: 72%
  content_team: 65%

SEMANA 3: Hierarquia emerge
  Tier 1: copywriter_designer
  Tier 2: strategy_team, content_team

SEMANA 4: Dynamic delegation
  copywriter_designer delega pra strategy_team
  strategy_team supervisiona content_team
  Decision flow: content → strategy → copywriter (se escalado)

SEMANA 6: Resource sharing
  copywriter_designer aloca expertise pra strategy_team
  strategy_team melhora, pode ser tier 1 em 2 semanas

SEMANA 8: Rebalanced hierarchy
  Tier 1: copywriter_designer (89%), strategy_team (85%)
  Tier 2: content_team (75%)
  Novo padrão: mais distributed leadership
```

---

## Next Steps

### Phase 9B (Hierarchy Visualization):
1. Org chart dinâmico
   - Visualizar parent-child relationships
   - Ver authority levels
   - Rastrear escalações

2. Leadership assessment
   - Score de competência por time
   - Readiness pra maior autoridade
   - Métricas de delegação

---

Tá pronto? Vamo testar Phase 9! 🚀
