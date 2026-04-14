# System Architecture — Paperclip Agent Evolution

## 🏗️ Overview Técnico

```
┌──────────────────────────────────────────────────────────┐
│           APPLICATION LAYER                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Bridge.mjs — Orquestrador Principal             │    │
│  │  • Tick loop a cada 30s                          │    │
│  │  • Dispatch de operações por fase                │    │
│  │  • Logging estruturado [phase{N}] prefixes       │    │
│  │  • Error handling e retry logic                  │    │
│  └─────────────────────────────────────────────────┘    │
│                        ↓                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Agent Evolution Module — 55 Funções             │    │
│  │  • Phase 1-6: Individual + Team Learning        │    │
│  │  • Phase 7-9: Organizational Structure          │    │
│  │  • Phase 10: Strategy Optimization              │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────┐
│           DATABASE LAYER                                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Supabase PostgreSQL                             │    │
│  │  • 52 tables total                               │    │
│  │  • RLS policies (Row Level Security)             │    │
│  │  • Foreign key constraints                       │    │
│  │  • Full text search indexes                      │    │
│  │  • JSONB columns for flexible data               │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model

### Core Entities

#### agent_teams
```sql
id UUID PRIMARY KEY
name TEXT
team_type TEXT — 'specialist_group', 'cross_functional'
member_count INT
performance_score FLOAT [0-1]
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### agent_memory (Phase 1)
```sql
id UUID PRIMARY KEY
agent_id TEXT
week INT
performance_score FLOAT
confidence FLOAT
learning_context JSONB
feedback_quality FLOAT
learnings JSONB — insights do agente
updated_at TIMESTAMP
```

#### team_decisions (Phase 7)
```sql
id UUID PRIMARY KEY
team_id UUID (FK)
question TEXT
context JSONB
status TEXT — 'pending', 'voting', 'resolved'
required_voters INT
created_at TIMESTAMP
resolved_at TIMESTAMP
```

#### team_best_practices (Phase 8)
```sql
id UUID PRIMARY KEY
source_team_id UUID (FK)
practice_type TEXT
practice_name TEXT
success_rate FLOAT
times_applied INT
times_successful INT
performance_lift FLOAT
discovered_at TIMESTAMP
```

#### team_hierarchies (Phase 9)
```sql
id UUID PRIMARY KEY
parent_team_id UUID
child_team_id UUID (FK)
hierarchy_level INT [1-3]
relationship_type TEXT — 'supervision', 'mentorship'
authority_delegation FLOAT [0-1]
established_at TIMESTAMP
```

#### team_strategies (Phase 10)
```sql
id UUID PRIMARY KEY
team_id UUID (FK)
strategy_name TEXT
strategy_type TEXT
success_rate FLOAT
times_applied INT
times_successful INT
performance_impact FLOAT
complexity_score INT [1-10]
discovered_at TIMESTAMP
```

### Supporting Tables
- `agent_forks` — Fork suggestions e aprovações (Phase 3)
- `team_votes` — Individual votes em decisões (Phase 7)
- `team_vote_consensus` — Resultado agregado de votações (Phase 7)
- `team_practice_adoption` — Histórico de adoção (Phase 8)
- `strategy_experiments` — Validação de estratégias (Phase 10)
- ... 40+ mais tabelas para suporte

---

## 🔄 Tick Loop Architecture

```javascript
async function tick() {
  // Incrementar contador
  tickCount++;
  
  // Phase 4: Votação (a cada 150 ticks = ~75s)
  if (tickCount % 150 === 0) {
    await collectTeamVotes();
  }
  
  // Phase 7: Resolução (a cada 180 ticks = ~90s)
  if (tickCount % 180 === 0) {
    await resolveTeamVotes();
  }
  
  // Phase 8: Best Practices (a cada 360 ticks = ~3h)
  if (tickCount % 360 === 0) {
    await discoverTeamBestPractices();
    await transferTeamKnowledge();
  }
  
  // Phase 9: Hierarquias (a cada 540 ticks = ~4.5h)
  if (tickCount % 540 === 0) {
    await rebuildTeamHierarchy();
  }
  
  // Phase 10: Estratégias (múltiplos intervalos)
  if (tickCount % 300 === 0) { // 2.5h
    await discoverOrganizationStrategies();
  }
  if (tickCount % 360 === 0) { // 3h
    await experimentWithStrategies();
  }
  if (tickCount % 420 === 0) { // 3.5h
    await analyzeStrategyHealth();
  }
  if (tickCount % 480 === 0) { // 4h
    await runStrategyOptimization();
  }
  if (tickCount % 600 === 0) { // 5h
    await propagateWinningStrategies();
  }
}

// Loop iniciado: setInterval(tick, 30000) // 30 segundos
```

---

## 🔐 Security Architecture

### Row Level Security (RLS)

```sql
-- Exemplo: Agentes só veem seu próprio memory
CREATE POLICY agent_memory_self_read ON agent_memory
  FOR SELECT USING (
    agent_id = current_user_id()
  );

-- Times veem decisões do seu próprio time
CREATE POLICY team_decisions_own_team ON team_decisions
  FOR SELECT USING (
    team_id IN (
      SELECT id FROM agent_teams 
      WHERE id = current_team_id()
    )
  );
```

### Authentication
- Service Key: Operações do sistema (Bridge)
- Anon Key: Futuro (API pública)
- JWT validation em boundaries críticos

### Data Validation
```javascript
// Cada função valida inputs:
function validateTeamId(teamId) {
  if (!teamId || typeof teamId !== 'string') {
    throw new Error('Invalid teamId');
  }
  if (!/^[a-f0-9-]{36}$/.test(teamId)) {
    throw new Error('Invalid UUID format');
  }
}
```

---

## 📈 Performance Characteristics

### Query Patterns

| Operation | Index | Time | Notes |
|-----------|-------|------|-------|
| Get team | team_id | 1ms | Indexed FK |
| List decisions | status, created_at | 5ms | Composite index |
| Count votes | decision_id | 2ms | Indexed FK |
| Aggregate votes | decision_id, choice | 3ms | Full scan limited |
| Search practices | success_rate | 5ms | DESC index |

### Bulk Operations

| Operation | Scale | Time | Space |
|-----------|-------|------|-------|
| Create 100 votes | 100 votes | ~50ms | O(1) |
| Aggregate 20 strategies | 20 strategies | ~30ms | O(n) |
| Promote to library | ~10 strategies | ~50ms | O(1) |
| Rebuild hierarchy | 50 teams | ~200ms | O(n²) worst case |

### Database Sizing

**Growth per Phase**:
```
Phase 7 (decisions): +10-20 records/hour
Phase 8 (practices): +1-3 records/day
Phase 9 (hierarchies): +0-1 records/day (rebuilds in place)
Phase 10 (strategies): +2-5 records/day

Monthly growth: ~500KB-1MB
Yearly: ~5-10MB
```

---

## 🔌 Integration Points

### Input Sources (Future)
- Feedback from external systems
- Manual decision inputs
- Performance metrics

### Output Targets (Future)
- REST API for dashboards
- WebSocket for real-time events
- Event streams (Kafka, etc.)

### Current Status
- ✅ Self-contained (Supabase ↔ Bridge)
- ✅ Async/non-blocking
- ✅ Fault-tolerant with logging

---

## 🛣️ Deployment Architecture

### Development
```
Local
├─ Node.js runtime
├─ .env.local with Supabase keys
└─ SQLite fallback (optional)
```

### Staging
```
Cloud (AWS/GCP/Azure)
├─ Node.js on compute (EC2/VM)
├─ Supabase PostgreSQL (managed)
├─ CloudWatch/Stackdriver logging
└─ Automated backups
```

### Production
```
Kubernetes Cluster
├─ Bridge service (replicated)
├─ Supabase PostgreSQL (HA cluster)
├─ Redis for caching (optional)
├─ Prometheus metrics
├─ ELK Stack for logging
└─ Automated disaster recovery
```

---

## 📊 Monitoring & Observability

### Logs
```javascript
// Estruturado com prefixos
[phase1] 📊 Avaliando trabalho...
[phase7] 🗳️ Decisão criada: {question}
[phase10] ✅ Experimento validado: {outcome}
[err] Erro ao reconstruir hierarquia: {message}
```

### Metrics
```javascript
// Prometheus-compatible (future)
- system_tick_duration_ms
- phase_execution_time_ms
- database_query_count
- error_count_by_phase
```

### Alerts (Future)
```
- Tick duration > 1000ms
- Database errors > 5% of operations
- Phase execution failure
- Data inconsistency detected
```

---

## 🔄 Consistency Model

### Eventual Consistency
- Phase operations are idempotent
- Duplicates auto-deduplicated
- Timestamps ensure ordering

### ACID Guarantees
- Individual operations ACID (via PostgreSQL)
- Distributed transactions: use Supabase transactions
- No two-phase commit (not needed)

### Conflict Resolution
- Last-write-wins for updates
- Explicit merge for hierarchies
- No concurrent modifications allowed per entity

---

## 🚀 Scaling Strategy

### Horizontal Scaling (Future)
```
Multiple Bridge instances:
├─ Shared Supabase backend
├─ Distributed locking (Redis)
├─ Ledger-based consensus (if needed)
└─ Event sourcing (optional)
```

### Vertical Scaling (Now)
```
Single Bridge instance:
├─ Query optimization
├─ Connection pooling
├─ Batch operations
└─ Caching (if needed)
```

---

## 🎯 Design Principles

1. **Simplicity First**: Prefer straightforward logic over clever optimizations
2. **Explicit State**: All state in database, no in-memory caches initially
3. **Auditability**: Every operation logged with timestamp and actor
4. **Autonomy**: Zero human intervention needed after setup
5. **Resilience**: All operations idempotent, errors logged not fatal
6. **Transparency**: System state queryable at any time

---

**Última atualização**: 2026-04-13  
**Versão**: 2.0.0
