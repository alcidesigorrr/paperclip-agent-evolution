# Phase 12: Fact-Checking - Technical Architecture

## 📐 Data Model

```sql
CREATE TABLE fact_claims (
  id UUID PRIMARY KEY,
  claim_text TEXT NOT NULL,
  source_agent TEXT NOT NULL,
  claim_category TEXT, -- 'statistic', 'comparison', 'process', 'opinion'
  created_at TIMESTAMP
);

CREATE TABLE fact_verification (
  id UUID PRIMARY KEY,
  claim_id UUID FK,
  source_type TEXT, -- 'website', 'google_search', 'api', 'news'
  source_name TEXT,
  finding TEXT,
  confidence FLOAT [0-1],
  verified_at TIMESTAMP
);

CREATE TABLE fact_verdicts (
  id UUID PRIMARY KEY,
  claim_id UUID FK,
  verdict TEXT, -- 'approved', 'rejected', 'needs_context', 'opinion'
  consensus_confidence FLOAT,
  suggested_rewording TEXT,
  created_at TIMESTAMP
);

CREATE TABLE accuracy_stats (
  id UUID PRIMARY KEY,
  agent_id TEXT UNIQUE,
  claims_made INT,
  approved_claims INT,
  rejected_claims INT,
  accuracy_rate FLOAT,
  last_measured_at TIMESTAMP
);
```

## 🔄 Workflow

### 1. Verificação
```
verifyClaimAccuracy(claim, agentId)
├─ Procura em website Sondar
├─ Busca no Google Search
├─ Consulta fact-check APIs
├─ Calcula consensus (média de confiança)
└─ Retorna veredicto
```

### 2. Decisão
```
Confidence > 0.85 → APPROVED ✓
Confidence 0.65-0.85 → NEEDS_CONTEXT ⚠️
Confidence < 0.65 → REJECTED ✗
```

### 3. Feedback
```
improveAgentAccuracy(agentId)
├─ Query claims rejeitadas do agente
├─ Descobre padrões de erro
├─ Gera recomendações específicas
└─ Atualiza agent memory
```

## 🚀 Integration

- **Input**: Claims durante execução de tarefas
- **Output**: Veredicto + suggested rewording
- **Storage**: Histórico de acurácia por agente
- **Learning**: Padrões de erro evitados

## ⚡ Performance

- verifyClaimAccuracy: 500ms-2s (3 API calls)
- improveAgentAccuracy: 200ms
- Monthly storage: ~10MB (100 claims × 3 sources)
