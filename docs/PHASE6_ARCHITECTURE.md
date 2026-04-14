# Phase 6: Architecture — Dynamic Company Structure

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│         PHASE 6: DYNAMIC COMPANY STRUCTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Organization Emerges Dynamically:                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. analyzeAgentSynergy() — quem trabalha bem junto?  │ │
│  │    synergy_score = (perf_avg + complementarity) * wt │ │
│  │                                                       │ │
│  │ 2. formTeam() — cria time baseado em synergy        │ │
│  │    leader + specialists + role assignments         │ │
│  │                                                       │ │
│  │ 3. evaluateTeamPerformance() — team tá bom?         │ │
│  │    avg feedback success % = performance_score       │ │
│  │                                                       │ │
│  │ 4. promoteAgent() — se performance > 80%            │ │
│  │    leader → senior_lead, specialist → lead          │ │
│  │                                                       │ │
│  │ 5. dissolveTeam() — se performance < 50%            │ │
│  │    is_active = false, agentes voltam ao pool        │ │
│  │                                                       │ │
│  │ 6. rebuildOrganizationStructure() — reorganiza tudo │ │
│  │    - Evalua todos times                             │ │
│  │    - Dissolve fracos                                │ │
│  │    - Forma novos                                    │ │
│  │    - Promove stars                                  │ │
│  │                                                       │ │
│  │ 7. getOrganizationChart() — retorna markdown        │ │
│  │    da estrutura emergente                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
│  Bridge.tick() every 30s                                    │
│  └─ rebuildStructure() [every 480 ticks = ~4 horas]       │
│     ├─ analyzeAgentSynergy() for each pair                │
│     ├─ formTeam() if synergy > 0.75                       │
│     ├─ evaluateTeamPerformance() for each team            │
│     ├─ promoteAgent() if perf > 80%                       │
│     └─ dissolveTeam() if perf < 50%                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### agent_teams
```
id: UUID (Primary Key)
team_name: TEXT — "copywriter_designer_team"
team_type: TEXT ∈ {task_force, specialty_team, cross_functional}
leader_agent_id: TEXT — quem lidera
purpose: TEXT — por que existe
specialization: JSONB — {pillar: "cases", focus: [...]}
members: JSONB
  = [{agent_id, role, joined_at}, ...]
performance_score: FLOAT [0-1]
  = avg of members' recent feedback success %
is_active: BOOLEAN
formation_reason: TEXT
dissolved_reason: TEXT (if dissolved)
created_at: TIMESTAMP
dissolved_at: TIMESTAMP (if dissolved)

Índices:
  - agent_teams(leader_id)
  - agent_teams(is_active)
  - agent_teams(team_type)
```

### agent_roles
```
id: UUID (Primary Key)
agent_id: TEXT
team_id: UUID (FK → agent_teams)
role_name: TEXT ∈ {leader, senior_lead, specialist, support, learner}
responsibility: TEXT
success_rate: FLOAT [0-1]
is_current: BOOLEAN (most recent role)
promoted_from_role: TEXT (career path)
promoted_at: TIMESTAMP
created_at: TIMESTAMP

Índices:
  - agent_roles(agent_id, is_current)
  - agent_roles(team_id)
```

### agent_synergy
```
id: UUID (Primary Key)
agent_a_id: TEXT
agent_b_id: TEXT
synergy_score: FLOAT [0-1]
successful_collaborations: INT
total_collaborations: INT
collaboration_type: TEXT
last_collaborated_at: TIMESTAMP
created_at: TIMESTAMP

Composite Index:
  - agent_synergy(agent_a_id, agent_b_id)
  - agent_synergy(synergy_score DESC)

Synergy Formula:
  synergy = 0.5 + (perf_average / 200 * 0.3) + (complementarity * 0.15)
  
  where:
    perf_average = (agentA.avg_perf + agentB.avg_perf) / 2
    complementarity = 1 - (overlapping_skills / total_skills)
```

### organizational_hierarchy
```
id: UUID (Primary Key)
hierarchy_level: INT (1=agent, 2=team, 3=division)
parent_unit_id: UUID (parent team/hierarchy)
unit_id: UUID (team ID or agent ID)
unit_type: TEXT ∈ {agent, team, division}
authority_level: FLOAT [0-1]
created_at: TIMESTAMP

Índices:
  - organizational_hierarchy(hierarchy_level)
  - organizational_hierarchy(unit_id)

Semantics:
  Tracks organizational structure over time.
  Authority level determines decision-making power.
```

### agent_promotions
```
id: UUID (Primary Key)
agent_id: TEXT
old_role: TEXT ("leader")
new_role: TEXT ("senior_lead")
reason: TEXT
old_team_id: UUID
new_team_id: UUID
effectiveness_increase: FLOAT (% improvement)
promoted_at: TIMESTAMP

Índices:
  - agent_promotions(agent_id)

Career Path Examples:
  individual → specialist (first team role)
  specialist → leader (promoted for performance)
  leader → senior_lead (exceptional performance)
```

## Function Specifications

### analyzeAgentSynergy(agentAId, agentBId)

**Purpose**: Measure how well two agents work together.

**Inputs**:
- agentAId: TEXT
- agentBId: TEXT

**Process**:
```
1. Query feedback_results for both agents (last 8 weeks)
   IF < 5 feedbacks total:
     return null

2. Calculate performance:
   aAvg = avg success % for agentA
   bAvg = avg success % for agentB

3. Analyze skill complementarity:
   Query agent_skills for both
   Complementarity = 1 - (overlapping_skills / max_skills)
   
   Example:
     agentA: copywriting, seo
     agentB: design, engagement
     overlap: 0 (no shared skills)
     complementarity = 1.0 (perfect complement)

4. Calculate synergy:
   synergy = min(0.95, 
     0.5 +                              // baseline
     ((aAvg + bAvg) / 200) * 0.3 +      // performance component
     complementarity * 0.15              // complementarity component
   )

5. Save/update in agent_synergy:
   IF exists: update with new score
   ELSE: create new record

6. Return synergy_score
```

**Synergy Interpretation**:
- 0.8+: Excellent fit, should definitely team
- 0.65-0.79: Good fit, can work together
- < 0.65: Weak fit, different strengths

---

### formTeam(teamName, leaderAgentId, memberAgentIds, specialization, purpose)

**Purpose**: Create a team from compatible agents.

**Inputs**:
- teamName: TEXT
- leaderAgentId: TEXT — who decides for the team
- memberAgentIds: [TEXT]
- specialization: JSONB
- purpose: TEXT

**Process**:
```
1. Build members array:
   members = [
     {agent_id, role: 'leader' if leader else 'specialist', joined_at},
     ...
   ]

2. Insert into agent_teams:
   {
     team_name,
     team_type: 'task_force',
     leader_agent_id,
     members,
     specialization,
     purpose,
     performance_score: 0.5 (initial),
     formation_reason: purpose,
     is_active: true
   }

3. Create agent_roles for each member:
   for each member:
     role_name = 'leader' or 'specialist'
     responsibility = based on role

4. Log:
   "[phase6] 🏢 Time formado: {teamName} ({N} membros, lider: {leader})"

5. Return team record
```

---

### evaluateTeamPerformance(teamId)

**Purpose**: Calculate team's effectiveness.

**Inputs**:
- teamId: UUID

**Process**:
```
1. Query agent_teams to get members

2. Query feedback_results for all members (last 4 weeks)
   IF no feedbacks:
     return null

3. Calculate average:
   avgPerformance = avg(success_percentage) / 100
   performanceScore = min(1.0, avgPerformance)

4. Update agent_teams:
   SET performance_score = performanceScore
   WHERE id = teamId

5. Log:
   "[phase6] 📊 Team {name} performance: {score%}"

6. Return performanceScore
```

---

### promoteAgent(agentId, newRole, teamId)

**Purpose**: Move agent to higher role based on performance.

**Inputs**:
- agentId: TEXT
- newRole: TEXT ("senior_lead", "lead", etc)
- teamId: UUID

**Process**:
```
1. Query current agent_roles for this agent:
   WHERE is_current = true

2. Deactivate old role:
   UPDATE agent_roles SET is_current = false

3. Create new role:
   INSERT into agent_roles:
     role_name: newRole
     promoted_from_role: old_role
     promoted_at: NOW()
     is_current: true

4. Log promotion in agent_promotions:
   old_role, new_role, reason, etc.

5. Log:
   "[phase6] ⬆️ {agentId} promovido: {oldRole} → {newRole}"

6. Return new role record
```

---

### dissolveTeam(teamId, reason)

**Purpose**: Deactivate underperforming team.

**Inputs**:
- teamId: UUID
- reason: TEXT

**Process**:
```
1. Update agent_teams:
   SET is_active = false,
       dissolved_at = NOW(),
       dissolved_reason = reason
   WHERE id = teamId

2. Deactivate all agent_roles in team:
   UPDATE agent_roles SET is_current = false
   WHERE team_id = teamId

3. Log in structure_events:
   event_type: 'team_dissolved'
   reason: reason

4. Log:
   "[phase6] 💔 Time dissolvido: {reason}"

5. Return true
```

---

### rebuildOrganizationStructure()

**Purpose**: Reorganize all teams based on current performance.

**Inputs**: None

**Process**:
```
1. Evaluate all active teams:
   for each team:
     perf = evaluateTeamPerformance(team_id)
     
     IF perf < 0.5:
       dissolveTeam(team_id, "Performance too low")
       dissolved++
     
     ELSE IF perf > 0.8:
       Try to promote leader
       promoted++

2. Analyze new synergies:
   Query agent_synergy ORDER BY synergy_score DESC LIMIT 5
   
   for each high-synergy pair:
     IF pair not already on same team:
       formTeam(name, leader, members, {}, purpose)
       formed++

3. Update hierarchy:
   Rebuild organizational_hierarchy based on teams

4. Log:
   "[phase6] ✅ Reorganização completa: {formed} times, {dissolved} dissolvidos, {promoted} promovidos"

5. Return {formed, dissolved, promoted}
```

---

### getOrganizationChart()

**Purpose**: Generate markdown organization visualization.

**Process**:
```
1. Query agent_teams WHERE is_active = true
   ORDER BY performance_score DESC

2. Build markdown:
   "## 📊 Organização Atual\n\n"

3. For each team:
   ### Team Name
   **Líder**: {leader} | **Performance**: {score%}
   **Propósito**: {purpose}
   **Membros**:
   - member1 (role1)
   - member2 (role2)

4. Query agent_synergy WHERE synergy_score > 0.75
   Add section: "### 🤝 High Synergy Pairs"
   List each pair with score

5. Return markdown string
```

---

## Integration Points

### In Bridge.tick()
```javascript
// Every 480 ticks (~4 hours)
if (tickCount % 480 === 0) {
  await rebuildStructure();
}
```

### In createPaperclipIssue()
```javascript
// Inject org chart into briefing
const orgChart = await buildOrganizationBriefing();
if (orgChart) {
  briefing += '\n' + orgChart;
}
```

---

## Evolution Flow

```
TIME: Week 1
├─ Agentes trabalham isolados
├─ Feedback começa a se acumular
└─ Padrões emergem

TIME: Week 2-3
├─ analyzeAgentSynergy() identifica ótimas duplas
├─ formTeam() cria primeiros times
├─ Teams começam a se estabelecer
└─ Performance scores são calculados

TIME: Week 4+
├─ rebuildOrganizationStructure() rodas a cada 4 horas
├─ Equipes de baixo desempenho dissolvem automaticamente
├─ Agentes de alto desempenho são promovidos
├─ Novos times se formam baseado em sinergia
└─ Organização é fluida e muda com performance real

TIME: Ongoing
├─ Estrutura emergente reflete real performance
├─ Melhores agentes em liderança
├─ Times que funcionam bem permanecem
├─ Fracassados desaparecem
└─ Organização auto-otimiza
```

---

## Performance Characteristics

### Synergy Analysis
```
Time: O(n) where n = feedback records (10-20)
Space: O(1)

Per pair: ~50ms
All agent pairs: ~500ms
```

### Team Evaluation
```
Time: O(n) where n = team members (2-5)
Space: O(1)

Per team: ~10ms
All teams: ~100ms
```

### Organization Rebuild
```
Time: ~1 second total
  - Evaluate teams: 100ms
  - Form new teams: 300ms
  - Promote agents: 50ms
  - Update hierarchy: 50ms
  - Generate chart: 50ms
  - Logging: 50ms

Runs every 4 hours asynchronously
```

---

## Future Enhancements

### Phase 7: Team Decision Making
```
- Teams vote on decisions together
- Team leader breaks ties
- Consensus feeds into team performance
```

### Phase 8: Cross-Team Learning
```
- High-performing teams share knowledge
- Patterns successful in one team tested elsewhere
- Team best practices propagate
```

### Phase 9: Emergent Hierarchies
```
- Senior teams manage junior teams
- Multi-level decision making
- Resource allocation across teams
```

---

Ready to test Phase 6? Check PHASE6_TESTING.md! 🚀
