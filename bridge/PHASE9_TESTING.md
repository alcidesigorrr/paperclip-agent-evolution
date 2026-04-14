# Phase 9: Testing Guide — Emergent Hierarchies

## Setup (5 min)

```bash
cd /Users/igoralcides/paperclip/bridge
supabase db push
node bridge.mjs
```

---

## Cenário 1: Formar Hierarquia (15 min)

```javascript
> const agent_evolution = require('./modules/agent-evolution.mjs');

// Time sênior (89% perf) supervisiona time junior (65% perf)
> const hierarchy = await agent_evolution.formTeamHierarchy(
    'team-senior',
    'team-junior',
    'supervision'
  );

> console.log(hierarchy);
// {
//   parent_team_id: 'team-senior',
//   child_team_id: 'team-junior',
//   hierarchy_level: 2,
//   authority_delegation: 0.65
// }
```

Verificar:
```sql
SELECT * FROM team_hierarchies
WHERE parent_team_id = 'team-senior' AND child_team_id = 'team-junior';
-- hierarchy_level: 2, authority_delegation: 0.65

SELECT team_id, total_authority FROM team_authority_levels
WHERE team_id IN ('team-senior', 'team-junior');
-- team-senior: 0.95 (executive), team-junior: 0.58 (manager)
```

---

## Cenário 2: Escalar Decisão (15 min)

```javascript
// Time junior com decisão complexa
> const escalation = await agent_evolution.escalateDecision(
    'team-junior',
    'complex-decision-uuid'
  );

> console.log(escalation);
// {
//   source_team_id: 'team-junior',
//   parent_team_id: 'team-senior',
//   status: 'pending'
// }
```

Verificar:
```sql
SELECT * FROM team_decision_escalations
WHERE source_team_id = 'team-junior';
-- parent_team_id: team-senior, status: pending
```

---

## Cenário 3: Alocar Recursos (15 min)

```javascript
> const allocation = await agent_evolution.allocateResources(
    'team-senior',
    'team-junior',
    'specialist_time',
    20
  );

> console.log(allocation);
// {
//   from_team_id: 'team-senior',
//   to_team_id: 'team-junior',
//   quantity: 20,
//   unit: 'hours',
//   status: 'pending'
// }
```

Verificar:
```sql
SELECT * FROM team_resource_allocation
WHERE from_team_id = 'team-senior' AND to_team_id = 'team-junior';
-- quantity: 20, status: pending
```

---

## Cenário 4: Reconstruir Hierarquia (30 min)

```javascript
// Múltiplos times na organização
// Top 20%: copywriter_designer (89%), strategy (82%)
// Outros: content (65%), experimental (40%)

> const result = await agent_evolution.rebuildHierarchy();

> console.log(result);
// {
//   hierarchiesFormed: 2,
//   topTierCount: 2
// }
```

Verificar:
```sql
-- Ver hierarquia formada
SELECT parent_team_id, child_team_id FROM team_hierarchies
WHERE established_at > NOW() - interval '1 min';

-- Ver autoridades atualizadas
SELECT team_id, total_authority FROM team_authority_levels
WHERE last_recalculated_at > NOW() - interval '1 min';
```

---

## Cenário 5: Authority Levels (20 min)

```javascript
// Team senior (tier 1, 89% perf)
SELECT total_authority FROM team_authority_levels
WHERE team_id = 'team-senior';
-- total_authority: 0.99 (EXECUTIVE)

// Team junior (tier 2, 65% perf, child of senior)
SELECT total_authority FROM team_authority_levels
WHERE team_id = 'team-junior';
-- total_authority: 0.77 (MANAGER)

// Team low (tier 3, 40% perf, child of junior)
SELECT total_authority FROM team_authority_levels
WHERE team_id = 'team-low';
-- total_authority: 0.52 (COORDINATOR)
```

---

## Cenário 6: Leadership Competence (25 min)

```javascript
// Avaliar se time está pronto pra maior autoridade
SELECT 
  team_id,
  decision_quality_score,
  member_satisfaction,
  readiness_for_greater_authority
FROM team_leadership_competence
WHERE team_id = 'team-junior';

-- readiness > 0.7 = pronto pra ser promoted
```

---

## Cenário 7: Hierarchy Metrics (15 min)

```javascript
SELECT 
  team_id,
  hierarchy_depth,
  subordinate_teams,
  autonomy_ratio
FROM team_hierarchy_metrics
WHERE team_id = 'team-senior';

-- hierarchy_depth: 1 (top tier)
-- subordinate_teams: 2 (direct reports)
-- autonomy_ratio: 1.0 (todas as decisões autônomas)
```

---

## Cenário 8: Full Rebuild Cycle (45 min)

```javascript
// Simular crescimento e reorganização

// Week 1: Inicial hierarchy
> await agent_evolution.rebuildHierarchy();

// Week 2: Performance muda
// (Update agent_teams.performance_score)

// Week 3: Rebuild novamente
> await agent_evolution.rebuildHierarchy();

// Esperado:
// - Times que melhoraram podem ter subido na hierarquia
// - Times que pioraram podem ter descido
// - Autoridades recalculadas
// - Novas relações formadas
```

---

## Test Checklist

| Test | How to Verify |
|------|---------------|
| Form hierarchy | hierarchy_level=2, authority_delegation set |
| Escalate decision | escalation created with parent_team_id |
| Allocate resources | allocation created with status=pending |
| Rebuild hierarchy | hierarchies formed, top 20% identified |
| Authority calculation | total_authority = base+perf+seniority+delegation |
| Leadership competence | readiness_for_greater_authority calculated |
| Hierarchy metrics | depth, subordinates, autonomy_ratio correct |
| Authority inheritance | child authority includes delegation from parent |

---

Ready to test? Cenário 1 → 8! 🚀
