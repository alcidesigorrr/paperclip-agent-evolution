# Phase 15: Expert Advisory - Technical Architecture

## 📐 Data Model

```sql
CREATE TABLE system_decisions (
  id UUID PRIMARY KEY,
  decision_type TEXT, -- 'content', 'strategy', 'resource'
  decision_context TEXT,
  recommended_action TEXT,
  ai_confidence FLOAT [0-1],
  escalation_threshold FLOAT DEFAULT 0.7,
  was_escalated BOOLEAN,
  escalated_to TEXT,
  expert_override BOOLEAN,
  actual_outcome TEXT,
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE TABLE explainability_logs (
  id UUID PRIMARY KEY,
  decision_id UUID FK,
  reasoning_chain JSONB,
  factors_considered TEXT[],
  confidence_factors JSONB,
  alternative_options JSONB
);

CREATE TABLE ai_learning_from_humans (
  id UUID PRIMARY KEY,
  decision_id UUID FK,
  human_choice TEXT,
  outcome_metric FLOAT,
  why_human_was_better TEXT,
  pattern_discovered TEXT,
  lesson_learned TEXT
);

CREATE TABLE autonomy_metrics (
  id UUID PRIMARY KEY,
  measurement_period TEXT,
  total_decisions INT,
  automated_decisions INT,
  escalated_decisions INT,
  automation_accuracy FLOAT,
  autonomy_level FLOAT [0-1]
);
```

## 🔄 Workflow

### 1. Decisão
```
makeDecisionWithConfidence(context, action)
├─ Analisa histórico
├─ Considera trends
├─ Avalia team capabilities
├─ Gera confidence score
└─ Se confidence >= 0.7: AUTO-APPROVE
   Se confidence < 0.7: ESCALATE
```

### 2. Explicação
```
explainDecision(decisionId)
├─ Reasoning chain (passo a passo)
├─ Fatores considerados
├─ Breakdown de confiança
├─ Alternativas analisadas
└─ Explicação clara pro humano
```

### 3. Aprendizado
```
recordHumanOverride(decision, humanChoice)
├─ Se humano fez melhor:
│  ├─ Registra lição aprendida
│  ├─ Atualiza modelo de decisão
│  └─ Melhora confidence prediction
└─ Se IA fez melhor:
   └─ Registra como validação
```

## ⚡ Performance

- makeDecisionWithConfidence: 100ms
- explainDecision: 50ms
- measureAutonomyMetrics: 200ms
- Learning loop: 500ms
