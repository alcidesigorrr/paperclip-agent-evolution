-- Phase 15: Expert Advisory & Human-in-the-Loop
-- Sistema toma decisões com confiança e explicabilidade, escalando ao humano quando necessário

-- Decisões do sistema com confiança
CREATE TABLE IF NOT EXISTS system_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT, -- 'content', 'strategy', 'resource_allocation', 'crisis'
  decision_context TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  ai_confidence FLOAT CHECK (ai_confidence BETWEEN 0 AND 1),
  escalation_threshold FLOAT DEFAULT 0.7, -- se confidence < isso, escalate
  was_escalated BOOLEAN DEFAULT FALSE,
  escalated_to TEXT, -- expert_id ou 'human'
  expert_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  actual_outcome TEXT,
  outcome_was_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  INDEX system_decisions_escalated (was_escalated),
  INDEX system_decisions_confidence (ai_confidence DESC),
  INDEX system_decisions_created (created_at DESC)
);

-- Inputs de especialistas humanos
CREATE TABLE IF NOT EXISTS expert_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES system_decisions(id) ON DELETE CASCADE,
  expert_name TEXT NOT NULL,
  expert_role TEXT, -- 'CMO', 'strategist', 'brand_manager'
  recommendation TEXT NOT NULL,
  reasoning TEXT,
  confidence_level FLOAT DEFAULT 0.8,
  decision_time INT, -- minutos levados pra decidir
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX expert_inputs_decision (decision_id),
  INDEX expert_inputs_expert (expert_name)
);

-- Sistema aprendendo com overrides
CREATE TABLE IF NOT EXISTS ai_learning_from_humans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES system_decisions(id) ON DELETE CASCADE,
  human_choice TEXT NOT NULL,
  ai_recommended TEXT,
  outcome_metric FLOAT, -- como foi a performance
  why_human_was_better TEXT,
  pattern_discovered TEXT,
  lesson_learned TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX ai_learning_from_humans_decision (decision_id),
  INDEX ai_learning_from_humans_created (created_at DESC)
);

-- Logs de explicabilidade
CREATE TABLE IF NOT EXISTS explainability_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES system_decisions(id) ON DELETE CASCADE,
  reasoning_chain JSONB, -- como o sistema chegou na recomendação
  factors_considered TEXT[], -- quais dados foram considerados
  confidence_factors JSONB, -- breakdown de confiança por fator
  alternative_options JSONB, -- outras opções consideradas
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX explainability_logs_decision (decision_id)
);

-- Performance geral de automação vs humano
CREATE TABLE IF NOT EXISTS autonomy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_period TEXT, -- 'day', 'week', 'month'
  total_decisions INT DEFAULT 0,
  automated_decisions INT DEFAULT 0,
  escalated_decisions INT DEFAULT 0,
  human_decisions INT DEFAULT 0,
  automation_accuracy FLOAT, -- % de decisões automáticas corretas
  human_accuracy FLOAT,
  time_saved_hours FLOAT,
  autonomy_level FLOAT, -- % de decisões feitas sem humano
  measured_at TIMESTAMP DEFAULT NOW(),

  INDEX autonomy_metrics_measured (measured_at DESC)
);
