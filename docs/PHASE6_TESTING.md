# Phase 6: Testing Guide — Dynamic Company Structure

## Setup (5 min)

```bash
cd /Users/igoralcides/paperclip/bridge
supabase db push
# ou: psql postgresql://... < migrations/20260417_dynamic_structure.sql

node bridge.mjs
```

---

## Cenário 1: Analisar Sinergia (10 min)

### Objetivo
Calcular compatibilidade entre dois agentes.

### Via código:
```javascript
node
> const agent_evolution = require('./modules/agent-evolution.mjs');
> const synergy = await agent_evolution.analyzeAgentSynergy(
    'copywriter_sondar',
    'designer_sondar'
  );
> console.log(synergy);

// Esperado: 0.65 - 0.85 (depends on feedback history)
```

### Verificar resultado
```sql
SELECT * FROM agent_synergy 
WHERE agent_a_id = 'copywriter_sondar' 
  AND agent_b_id = 'designer_sondar';

-- Esperado:
synergy_score | total_collaborations | last_collaborated_at
--------------|----------------------|-----------
0.78          | 1                    | 2026-04-17
```

### Logs esperados
```
[phase6] 🤝 Sinergia copywriter_sondar ↔ designer_sondar: 78%
```

---

## Cenário 2: Formar Time (15 min)

### Setup: Ter sinergia calculada
```sql
-- Se não tiver, criar feedback pra gerar sinergia
INSERT INTO feedback_results (agent_id, task_type, expected_value, actual_value)
VALUES
  ('copywriter_sondar', 'content_creation', 100, 125),
  ('designer_sondar', 'design', 100, 130);
```

### Formar time
```javascript
> const team = await agent_evolution.formTeam(
    'copywriter_designer_team',
    'copywriter_sondar',
    ['copywriter_sondar', 'designer_sondar'],
    {pillar: 'cases'},
    'High-quality case study content'
  );
> console.log(team.team_name);

// Esperado: "copywriter_designer_team"
```

### Verificar
```sql
SELECT * FROM agent_teams WHERE team_name = 'copywriter_designer_team';

-- Esperado:
team_name              | leader_id           | is_active | performance_score
-----------------------|---------------------|-----------|------------------
copywriter_designer... | copywriter_sondar   | true      | 0.5
```

### Verificar roles
```sql
SELECT agent_id, role_name FROM agent_roles 
WHERE team_id = (
  SELECT id FROM agent_teams 
  WHERE team_name = 'copywriter_designer_team'
);

-- Esperado:
agent_id          | role_name
------------------|----------
copywriter_sondar | leader
designer_sondar   | specialist
```

### Logs esperados
```
[phase6] 🏢 Time formado: copywriter_designer_team (2 membros, lider: copywriter_sondar)
```

---

## Cenário 3: Avaliar Performance do Time (10 min)

### Setup: Ter time criado
```javascript
// Use team ID from Cenário 2
> const teamId = 'uuid-team-1';  // get from agent_teams

// Gerar feedbacks pro time ter performance
> await agent_evolution.submitFeedbackResult(
    'issue#team1',
    'copywriter_sondar',
    'content_creation',
    'engagement',
    100,
    130
  );

> await agent_evolution.submitFeedbackResult(
    'issue#team2',
    'designer_sondar',
    'design',
    'quality',
    100,
    125
  );
```

### Avaliar performance
```javascript
> const perf = await agent_evolution.evaluateTeamPerformance(teamId);
> console.log(perf);

// Esperado: ~1.25 (130% success + 125% success / 2)
```

### Verificar
```sql
SELECT performance_score FROM agent_teams WHERE id = 'uuid-team-1';

-- Esperado: ~0.95 (capped at 1.0)
```

### Logs esperados
```
[phase6] 📊 Team copywriter_designer_team performance: 95%
```

---

## Cenário 4: Promover Agente (10 min)

### Setup: Time com bom performance
```javascript
// Usar team do Cenário 3
> const agentId = 'copywriter_sondar';
> const teamId = 'uuid-team-1';
```

### Promover
```javascript
> await agent_evolution.promoteAgent(
    agentId,
    'senior_lead',
    teamId
  );
```

### Verificar
```sql
SELECT * FROM agent_roles 
WHERE agent_id = 'copywriter_sondar' 
  AND is_current = true;

-- Esperado:
role_name    | is_current
-------------|----------
senior_lead  | true
```

### Verificar histórico
```sql
SELECT * FROM agent_promotions 
WHERE agent_id = 'copywriter_sondar';

-- Esperado:
old_role | new_role   | reason
---------|-----------|------------------------
leader   | senior_lead| Performance and expertise...
```

### Logs esperados
```
[phase6] ⬆️ copywriter_sondar promovido: leader → senior_lead
```

---

## Cenário 5: Dissolver Time (10 min)

### Setup: Criar time fraco
```sql
-- Team com low performance
INSERT INTO agent_teams 
(team_name, leader_id, team_type, purpose, performance_score, is_active)
VALUES (
  'bad_team',
  'designer_sondar',
  'task_force',
  'Experimental low-performance team',
  0.35,
  true
);

-- Get ID
SELECT id FROM agent_teams WHERE team_name = 'bad_team';
```

### Dissolver
```javascript
> await agent_evolution.dissolveTeam(
    'uuid-bad-team',
    'Performance too low: 35%'
  );
```

### Verificar
```sql
SELECT is_active, dissolved_reason FROM agent_teams 
WHERE team_name = 'bad_team';

-- Esperado:
is_active | dissolved_reason
----------|---------------------------
false     | Performance too low: 35%
```

### Logs esperados
```
[phase6] 💔 Time dissolvido: Performance too low: 35%
```

---

## Cenário 6: Rebuild Organization (30 min)

### Setup: Deixar Bridge rodar naturalmente
```
Bridge roda rebuildOrganizationStructure() a cada 480 ticks (~4 horas)

Pra forçar:
```

### Forçar reorganização
```javascript
> const result = await agent_evolution.rebuildOrganizationStructure();
> console.log(result);

// Esperado:
{
  formed: 1,      // times formados
  dissolved: 1,   // times dissolvidos
  promoted: 0     // agentes promovidos
}
```

### Verificar resultado
```sql
-- Times ativos
SELECT COUNT(*) FROM agent_teams WHERE is_active = true;

-- Sinergia alta
SELECT COUNT(*) FROM agent_synergy WHERE synergy_score > 0.75;

-- Promoções
SELECT COUNT(*) FROM agent_promotions;
```

### Logs esperados
```
[phase6] 🔄 Reconstruindo estrutura organizacional...
[phase6] ✅ Reorganização completa: 1 times, 1 dissolvidos, 0 promovidos
```

---

## Cenário 7: Org Chart (10 min)

### Objetivo
Ver estrutura emergente.

### Gerar organograma
```javascript
> const chart = await agent_evolution.getOrganizationChart();
> console.log(chart);

// Esperado:
// ## 📊 Organização Atual
//
// ### copywriter_designer_team
// **Líder**: copywriter_sondar | **Performance**: 95%
// ...
```

### Verificar em markdown
```
Esperado output:
## 📊 Organização Atual

### copywriter_designer_team
**Líder**: copywriter_sondar | **Performance**: 95%
**Propósito**: High-quality case study content
**Membros**:
- copywriter_sondar (leader)
- designer_sondar (specialist)

### 🤝 High Synergy Pairs
- copywriter_sondar ↔ designer_sondar (78%)
```

---

## Cenário 8: Full Rebuild Cycle (45 min)

### Objetivo
Ver sistema completo rodando.

### Flow
```
1. Bridge roda analyzeAgentLearning() (2 horas)
   → Descobre padrões, skills, degradação

2. Bridge roda rebuildOrganizationStructure() (4 horas)
   → Analisa synergy
   → Forma/dissolve times
   → Promove agentes
   → Atualiza hierarchy

3. CMO vê no briefing:
   - Organograma atualizado
   - Novas promoções
   - Times reformados
```

### Simular ciclo completo
```javascript
// Passo 1: Feedback
> await submitFeedbackResult(...);

// Passo 2: Analysis (Phase 5)
> await discoverLearningPatterns(...);

// Passo 3: Synergy analysis
> await analyzeAgentSynergy(...);

// Passo 4: Form team
> await formTeam(...);

// Passo 5: Rebuild structure
> await rebuildOrganizationStructure();

// Passo 6: View org chart
> const chart = await getOrganizationChart();
```

---

## Debugging

### Checklist
```
1. ✅ Feedback registrado?
   SELECT COUNT(*) FROM feedback_results;

2. ✅ Synergy calculado?
   SELECT COUNT(*) FROM agent_synergy;

3. ✅ Teams formados?
   SELECT COUNT(*) FROM agent_teams WHERE is_active = true;

4. ✅ Roles designados?
   SELECT COUNT(*) FROM agent_roles;

5. ✅ Agentes promovidos?
   SELECT COUNT(*) FROM agent_promotions;

6. ✅ Bridge rodou rebuild?
   Procurar por [phase6] nos logs
```

---

## Test Checklist

| Test | ✓ | How to Verify |
|------|---|---------------|
| Calculate synergy | | agent_synergy has score 0-1 |
| Form team | | Team appears in agent_teams, is_active=true |
| Assign roles | | Roles appear in agent_roles |
| Evaluate team perf | | performance_score updated in agent_teams |
| Promote agent | | Old role is_current=false, new role is_current=true |
| Dissolve team | | Team is_active=false, dissolved_reason set |
| Rebuild org | | Teams formed/dissolved based on logic |
| Generate org chart | | Chart markdown includes all active teams |
| Synergy drives team formation | | Teams formed have synergy_score > 0.75 |
| Low performance triggers dissolution | | Teams with perf < 0.5 are dissolved |

---

Ready to test? Cenário 1 → 8! 🚀
