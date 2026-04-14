# Phase 8: Testing Guide — Cross-Team Learning

## Setup (5 min)

```bash
cd /Users/igoralcides/paperclip/bridge
supabase db push
node bridge.mjs
```

---

## Cenário 1: Descobrir Best Practice (15 min)

```javascript
> const agent_evolution = require('./modules/agent-evolution.mjs');

// Time com alta performance
> const practice = await agent_evolution.discoverBestPractices('team-high-perf');
> console.log(practice);

// Esperado:
// {
//   source_team_id: 'team-high-perf',
//   practice_type: 'collaboration_pattern',
//   success_rate: 0.89,
//   performance_lift: 0.24,
//   complexity_level: 2
// }
```

Verificar:
```sql
SELECT practice_name, success_rate FROM team_best_practices
WHERE source_team_id = 'team-high-perf';
-- success_rate: 0.89, performance_lift: 0.24
```

---

## Cenário 2: Propor Transferência (10 min)

```javascript
> const transfer = await agent_evolution.proposeKnowledgeTransfer(
    'team-high-perf',
    'team-low-perf',
    practice.id
  );

> console.log(transfer.transfer_status);
// 'proposed'
```

Verificar:
```sql
SELECT * FROM team_knowledge_transfer
WHERE source_team_id = 'team-high-perf' AND target_team_id = 'team-low-perf';
-- transfer_status: proposed
```

---

## Cenário 3: Adotar Prática (15 min)

```javascript
> const adoption = await agent_evolution.adoptPractice(
    'team-low-perf',
    practice.id
  );

> console.log(adoption.adoption_status);
// 'trial'
> console.log(adoption.baseline_performance);
// 0.55 (team's current performance)
```

Verificar:
```sql
SELECT adoption_status, baseline_performance FROM team_practice_adoption
WHERE team_id = 'team-low-perf' AND practice_id = 'practice-uuid';
-- adoption_status: trial, baseline: 0.55
```

---

## Cenário 4: Medir Impacto (20 min)

```javascript
// Simular 2 semanas depois, team melhorou
// (Atualize agent_teams.performance_score = 0.72)

> const impact = await agent_evolution.measureAdoptionImpact(
    'team-low-perf',
    practice.id
  );

> console.log(impact);
// {
//   current_performance: 0.72,
//   performance_delta: 0.17,
//   success_count: 1,
//   adoption_confidence: 0.7
// }
```

Verificar:
```sql
SELECT performance_delta, adoption_confidence FROM team_practice_adoption
WHERE team_id = 'team-low-perf';
-- performance_delta: 0.17, adoption_confidence: 0.7
```

---

## Cenário 5: Learning Network (10 min)

```javascript
// Após impacto positivo, network é criado
SELECT * FROM team_learning_networks
WHERE team_a_id = 'team-high-perf' AND team_b_id = 'team-low-perf';

-- collaboration_count: 1
-- mutual_benefit_score: 0.085 (0 + 0.17) / 2
```

---

## Cenário 6: Propagação (25 min)

```javascript
// Agora múltiplos times adotam
> await agent_evolution.proposeKnowledgeTransfer(
    'team-high-perf',
    'team-mid-perf',
    practice.id
  );
> await agent_evolution.adoptPractice('team-mid-perf', practice.id);

// Simular sucesso também
> await agent_evolution.measureAdoptionImpact('team-mid-perf', practice.id);

// Query practice spread
SELECT times_applied, times_successful FROM team_best_practices
WHERE id = 'practice-uuid';
-- times_applied: 2, times_successful: 2
```

---

## Test Checklist

| Test | How to Verify |
|------|---------------|
| Discover practice | success_rate > 0, complexity_level set |
| Propose transfer | transfer_status = 'proposed' |
| Adopt practice | adoption_status = 'trial', baseline_perf saved |
| Measure impact | performance_delta calculated, confidence updated |
| Learning network | mutual_benefit_score calculated |
| Practice propagation | times_applied incremented |
| Performance lift | adoption_status can become 'adopted' if delta > 0.1 |

---

Ready to test? Cenário 1 → 6! 🚀
