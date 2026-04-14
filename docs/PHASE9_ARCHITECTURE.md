# Phase 9: Architecture — Emergent Hierarchies

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│         PHASE 9: EMERGENT HIERARCHIES                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hierarquias Emergem Dinamicamente:                         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. formTeamHierarchy() — parent supervisiona child   │ │
│  │    hierarchy_level, authority_delegation             │ │
│  │                                                       │ │
│  │ 2. escalateDecision() — decisão complexa sobe       │ │
│  │    child → parent para resolução                     │ │
│  │                                                       │ │
│  │ 3. allocateResources() — parent aloca resources     │ │
│  │    expertise, specialist_time, etc                   │ │
│  │                                                       │ │
│  │ 4. calculateTeamAuthority() — total authority       │ │
│  │    base + performance + delegation authority        │ │
│  │                                                       │ │
│  │ 5. rebuildHierarchy() — reorganiza tudo            │ │
│  │    Top 20% = tier 1 (seniors)                       │ │
│  │    Outros distribuem-se embaixo                     │ │
│  │                                                       │ │
│  │ 6. assessLeadershipCompetence() — qual time        │ │
│  │    está pronto pra maior autoridade?               │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  Bridge.tick() every 30s                                    │
│  └─ rebuildTeamHierarchy() [every 540 ticks = ~4.5h]      │
│     ├─ formTeamHierarchy() pra pairs high/low perf        │
│     ├─ calculateTeamAuthority() atualiza pra tudo         │
│     └─ Métricas: autonomy_ratio, depth, etc              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### team_hierarchies
```
id: UUID (Primary Key)
parent_team_id: UUID (FK → agent_teams) — pode ser NULL (tier 1)
child_team_id: UUID NOT NULL (FK → agent_teams)
hierarchy_level: INT [1-3]
  1 = top tier (executives)
  2 = middle tier
  3 = junior tier
relationship_type: TEXT ∈ {supervision, mentorship, collaboration}
parent_provides: TEXT[] DEFAULT {'direction', 'resources'}
  Que o parent oferece ao child
authority_delegation: FLOAT [0-1]
  % de autonomia que child tem
  0.3 = muita supervisão (daily check-ins)
  0.7 = muita autonomia (weekly check-ins)
established_at: TIMESTAMP

UNIQUE(parent_team_id, child_team_id)

Índices:
  - team_hierarchies(parent_team_id)
  - team_hierarchies(child_team_id)
  - team_hierarchies(hierarchy_level)
```

### team_authority_levels
```
id: UUID (Primary Key)
team_id: UUID NOT NULL UNIQUE (FK → agent_teams)
base_authority: FLOAT [0-1]
  = assigned authority (ex: 0.5 for new teams)
performance_authority: FLOAT [0-1]
  = boost baseado em performance
  = max(0, (performance_score - 0.65) * 0.2)
  Range: [0, 0.3]
seniority_authority: FLOAT [0-1]
  = boost por estar em tier superior
  tier 1: 0.15
  tier 2: 0.05
  tier 3: 0
delegation_authority: FLOAT [0-1]
  = boost recebido de parent (authority_delegation)
total_authority: FLOAT [0-1] GENERATED ALWAYS AS
  = min(1.0, base + performance + seniority + delegation)
decision_scope: TEXT[]
  Tipos de decisão que pode tomar
  ["strategic", "tactical", "day_to_day"]
escalation_threshold: FLOAT [0-1]
  Se decisão_complexity > isso, precisa escalar
  Default: 0.7 (70% complexity = escalate)
last_recalculated_at: TIMESTAMP

Índices:
  - team_authority_levels(team_id)
  - team_authority_levels(total_authority DESC)
```

### team_resource_allocation
```
id: UUID (Primary Key)
from_team_id: UUID NOT NULL (FK → agent_teams)
to_team_id: UUID NOT NULL (FK → agent_teams)
resource_type: TEXT ∈ {specialist_time, knowledge_sharing, infrastructure}
quantity: FLOAT
unit: TEXT ∈ {hours, items, percentage}
duration_days: INT
priority: INT [1-10]
  1 = critical
  10 = nice-to-have
justification: TEXT
approved_by_team_id: UUID — qual time aprovou
status: TEXT ∈ {pending, approved, active, completed, rejected}
allocated_at: TIMESTAMP
completed_at: TIMESTAMP
actual_impact: JSONB
  {performance_delta, time_spent, outcome}
created_at: TIMESTAMP

Índices:
  - team_resource_allocation(from_team_id)
  - team_resource_allocation(to_team_id)
  - team_resource_allocation(status)
```

### team_decision_escalations
```
id: UUID (Primary Key)
source_team_id: UUID NOT NULL (FK → agent_teams)
parent_team_id: UUID (FK → agent_teams) — NULL se não tem parent
decision_id: UUID (FK → team_decisions)
escalation_reason: TEXT ∈ {complexity_exceeded, resource_needed, cross_team_impact}
original_complexity: INT [1-10]
escalation_urgency: INT [1-10]
status: TEXT ∈ {pending, acknowledged, resolved, escalated_further}
parent_decision_id: UUID — se parent criou nova decision
escalated_at: TIMESTAMP
resolved_at: TIMESTAMP
resolution_notes: TEXT

Índices:
  - team_decision_escalations(source_team_id)
  - team_decision_escalations(parent_team_id)
  - team_decision_escalations(status)
```

### team_hierarchy_metrics
```
id: UUID (Primary Key)
team_id: UUID NOT NULL UNIQUE (FK → agent_teams)
hierarchy_depth: INT
  1 = top (no parent)
  2 = middle (has parent, has children)
  3 = leaf (has parent, no children)
subordinate_teams: INT
  Quantos times reportam direto
decisions_escalated_to_parent: INT
decisions_made_autonomously: INT
autonomy_ratio: FLOAT [0-1]
  = autonomous / total
resource_dependency_ratio: FLOAT [0-1]
  = resource_requests_from_parent / total_resources_needed
leadership_effectiveness: FLOAT [0-1]
  Como subordinados avaliam a liderança
  Baseado em: member_satisfaction de child teams
last_measured_at: TIMESTAMP

UNIQUE(team_id)

Índices:
  - team_hierarchy_metrics(team_id)
```

### team_leadership_competence
```
id: UUID (Primary Key)
team_id: UUID NOT NULL UNIQUE (FK → agent_teams)
leadership_style: TEXT ∈ {democratic, directive, coaching, delegative}
decision_quality_score: FLOAT [0-1]
  = avg success_rate dos decisions feitas pelo time
member_satisfaction: FLOAT [1-5]
  Como os membros avaliam a liderança
conflict_resolution_ability: FLOAT [0-1]
  Quão bem resolve conflitos
strategic_thinking: FLOAT [0-1]
  Quão bem pensa no longo prazo
delegation_ability: FLOAT [0-1]
  Quão bem delega
team_development_focus: FLOAT [0-1]
  Quanto investem no crescimento dos membros
readiness_for_greater_authority: FLOAT [0-1] GENERATED ALWAYS AS
  = (decision_quality + member_satisfaction/5 + conflict_res + strategic) / 4
last_assessed_at: TIMESTAMP

Índices:
  - team_leadership_competence(team_id)
  - team_leadership_competence(readiness_for_greater_authority DESC)
```

### team_hierarchy_events (audit log)
```
id: UUID (Primary Key)
event_type: TEXT ∈ {hierarchy_formed, team_promoted, authority_increased, escalation_handled}
parent_team_id: UUID
child_team_id: UUID
team_id: UUID
details: JSONB
created_at: TIMESTAMP

Índices:
  - team_hierarchy_events(event_type)
  - team_hierarchy_events(created_at DESC)
```

---

## Function Specifications

### formTeamHierarchy(parentTeamId, childTeamId, relationshipType)

**Purpose**: Cria relação pai-filho entre times.

**Inputs**:
- parentTeamId: UUID
- childTeamId: UUID
- relationshipType: TEXT ("supervision", "mentorship", default: "supervision")

**Process**:
```
1. Validate parent team:
   SELECT performance_score FROM agent_teams WHERE id = parentTeamId
   IF performance_score < 0.75:
     return error("Parent precisa de 75%+ performance")

2. Check if hierarchy already exists:
   SELECT * FROM team_hierarchies
   WHERE parent = parentTeamId AND child = childTeamId
   IF exists: return existing

3. Determine hierarchy_level:
   SELECT MAX(hierarchy_level) FROM team_hierarchies
   WHERE parent_team_id = parentTeamId
   hierarchy_level = 2 (child sempre é nível 2)

4. Insert into team_hierarchies:
   {
     parent_team_id: parentTeamId,
     child_team_id: childTeamId,
     hierarchy_level: 2,
     relationship_type: relationshipType,
     parent_provides: ['direction', 'resources'],
     authority_delegation: 0.65 (padrão),
     established_at: NOW()
   }

5. Initialize authority levels:
   parent:
     base_authority: 0.8
     decision_scope: ['strategic', 'resource_allocation']
   child:
     base_authority: 0.5
     decision_scope: ['tactical', 'day_to_day']
     delegation_authority: 0.65

6. Log:
   "[phase9] 🏛️ Hierarquia: {parent} → {child}"

7. Return hierarchy record
```

---

### escalateDecision(childTeamId, decisionId)

**Purpose**: Escala decisão complexa pro parent.

**Inputs**:
- childTeamId: UUID
- decisionId: UUID

**Process**:
```
1. Query hierarchy:
   SELECT parent_team_id FROM team_hierarchies
   WHERE child_team_id = childTeamId
   IF NOT found: return error("Time sem parent")

2. Query decision:
   SELECT complexity FROM team_decisions WHERE id = decisionId

3. Insert escalation:
   {
     source_team_id: childTeamId,
     parent_team_id: parentTeamId,
     decision_id: decisionId,
     escalation_reason: 'complexity_exceeded',
     original_complexity: complexity,
     escalation_urgency: 7,
     status: 'pending',
     escalated_at: NOW()
   }

4. Update decision status:
   UPDATE team_decisions SET status='escalated'
   WHERE id = decisionId

5. Log:
   "[phase9] 📤 Escalação: {child} → {parent}"

6. Return escalation record
```

---

### allocateResources(fromTeamId, toTeamId, resourceType, quantity)

**Purpose**: Aloca recursos de time sênior pra time junior.

**Inputs**:
- fromTeamId: UUID
- toTeamId: UUID
- resourceType: TEXT
- quantity: FLOAT

**Process**:
```
1. Validate teams exist

2. Check if hierarchy allows:
   SELECT parent_team_id FROM team_hierarchies
   WHERE child_team_id = toTeamId AND parent = fromTeamId
   IF NOT exists: WARNING (alocação entre não-hierárquicos)

3. Insert allocation:
   {
     from_team_id: fromTeamId,
     to_team_id: toTeamId,
     resource_type: resourceType,
     quantity: quantity,
     unit: 'hours',
     duration_days: 7,
     status: 'pending',
     justification: "Alocação de {quantity}h"
   }

4. Log:
   "[phase9] 💼 Alocação: {quantity}h de {resourceType}"

5. Return allocation record
```

---

### rebuildHierarchy()

**Purpose**: Reconstrói hierarquia organizacional automaticamente.

**Inputs**: None

**Process**:
```
1. Fetch all active teams:
   SELECT * FROM agent_teams
   WHERE is_active = true
   ORDER BY performance_score DESC

2. Identify tiers:
   topTier = teams[0 : ceil(count * 0.2)]  // top 20%
   otherTiers = teams[ceil(count * 0.2):]  // rest 80%

3. Clear old hierarchies:
   DELETE FROM team_hierarchies
   (ou marcar como 'archived')

4. Form new hierarchies:
   FOR each team in otherTiers:
     bestFit = topTier[0]  // simplificado: primeiro top
     formTeamHierarchy(bestFit, team)

5. Update authority levels:
   FOR each team:
     performance_boost = max(0, (perf - 0.65) * 0.2)
     seniority_boost = team in topTier ? 0.15 : 0
     UPDATE team_authority_levels
     SET performance_authority = performance_boost,
         seniority_authority = seniority_boost

6. Calculate metrics:
   FOR each team:
     depth = calculate_hierarchy_depth(team)
     subordinates = COUNT(children)
     autonomy_ratio = calc_autonomy(team)
     UPDATE team_hierarchy_metrics

7. Log:
   "[phase9] ✅ Hierarquia reconstruída: {N} relações"

8. Return {hierarchiesFormed, topTierCount}
```

---

## Authority Formula

```
total_authority = min(1.0,
    base_authority (0.3-0.8)
    + performance_authority (0.0-0.3)
    + seniority_authority (0.0-0.15)
    + delegation_authority (0.0-0.7)
)

Example:
  Team A (tier 1, 85% perf):
    base: 0.8
    performance: (0.85 - 0.65) * 0.2 = 0.04
    seniority: 0.15 (tier 1)
    delegation: 0 (no parent)
    total: min(1.0, 0.8 + 0.04 + 0.15 + 0) = 0.99 ≈ EXECUTIVE

  Team B (tier 2, 70% perf, child of A):
    base: 0.5
    performance: (0.70 - 0.65) * 0.2 = 0.01
    seniority: 0.05 (tier 2)
    delegation: 0.65 (from parent A)
    total: min(1.0, 0.5 + 0.01 + 0.05 + 0.65) = 1.0 ≈ MANAGER

  Team C (tier 3, 55% perf, child of B):
    base: 0.5
    performance: (0.55 - 0.65) * 0.2 = -0.02 → 0 (min 0)
    seniority: 0 (tier 3)
    delegation: 0.5 (from parent B)
    total: min(1.0, 0.5 + 0 + 0 + 0.5) = 1.0 BUT capped at decision_scope
```

---

## Escalation Flow

```
Team C (authority: 0.6) facing decision (complexity: 8/10):

1. Check: complexity (8) > escalation_threshold (0.7)?
   8 > 0.7 → YES, escalate

2. escalateDecision(teamC, decision):
   Find parent: Team B
   Create escalation

3. Team B (authority: 0.8, threshold: 0.75) reviews:
   Complexity 8 > threshold 0.75 → Can handle OR escalate further

4. IF Team B escalates:
   Find parent: Team A
   escalate_further()

5. Team A (authority: 0.99, threshold: 0.95) reviews:
   Complexity 8 < 0.95 → Can handle
   Makes final decision

Flow: C → B → A → RESOLVED
```

---

## Integration Points

### In Bridge.tick()
```javascript
// A cada 540 ticks (~4.5 horas):
if (tickCount % 540 === 0) {
  await rebuildTeamHierarchy();
}

rebuildTeamHierarchy():
  ├─ Identifica top performers (tier 1)
  ├─ Forms hierarchies com outros times
  ├─ Atualiza authority levels
  └─ Logs resultado
```

---

## Performance Characteristics

### Hierarchy Formation
```
Time: O(n²) worst case, O(n) best case
Space: O(n)

Per team: ~5ms
All teams: ~50ms (10 teams)
```

### Authority Recalculation
```
Time: O(n)
Space: O(1)

Per team: ~1ms
All teams: ~10ms
```

### Escalation Handling
```
Time: O(h) where h = hierarchy depth (typically 2-3)
Space: O(1)

Per escalation: ~5ms
```

---

Ready to test Phase 9? Check PHASE9_TESTING.md! 🚀
