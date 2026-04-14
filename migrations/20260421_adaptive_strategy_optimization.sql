-- Phase 10: Adaptive Strategy Optimization
-- Sistema aprende estratégias bem-sucedidas e as propaga automaticamente

-- Estratégias identificadas por time
CREATE TABLE IF NOT EXISTS team_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  strategy_name TEXT NOT NULL,
  strategy_type TEXT, -- 'collaboration', 'timing', 'task_decomposition', 'resource_allocation'
  description TEXT,
  implementation_steps JSONB,
  success_rate FLOAT DEFAULT 0.0 CHECK (success_rate BETWEEN 0 AND 1),
  times_applied INT DEFAULT 0,
  times_successful INT DEFAULT 0,
  performance_impact FLOAT DEFAULT 0.0, -- quanto melhora performance
  complexity_score INT CHECK (complexity_score BETWEEN 1 AND 10), -- 1=simples, 10=complexo
  required_conditions JSONB, -- quando aplicar (ex: team_size > 3)
  conflicts_with TEXT[], -- estratégias que conflitam
  synergy_with TEXT[], -- estratégias que combinam bem
  discovered_at TIMESTAMP DEFAULT NOW(),
  last_validated_at TIMESTAMP,

  INDEX team_strategies_team (team_id),
  INDEX team_strategies_success_rate (success_rate DESC),
  INDEX team_strategies_type (strategy_type)
);

-- Experimentos com estratégias
CREATE TABLE IF NOT EXISTS strategy_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  strategy_id UUID REFERENCES team_strategies(id),
  experiment_type TEXT, -- 'validation', 'improvement', 'combination', 'novel'
  description TEXT,
  baseline_performance FLOAT,
  hypothesis TEXT,
  expected_outcome TEXT,
  actual_outcome TEXT,
  outcome_metric FLOAT,
  duration_cycles INT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'inconclusive')),
  confidence FLOAT DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  INDEX strategy_experiments_team (team_id),
  INDEX strategy_experiments_status (status),
  INDEX strategy_experiments_completed (completed_at)
);

-- Histórico de estratégias por time
CREATE TABLE IF NOT EXISTS team_strategy_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  strategy_id UUID REFERENCES team_strategies(id),
  adoption_date TIMESTAMP DEFAULT NOW(),
  adoption_status TEXT, -- 'active', 'archived', 'superseded'
  usage_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  performance_before FLOAT,
  performance_after FLOAT,
  performance_delta FLOAT,
  notes TEXT,

  INDEX team_strategy_history_team (team_id),
  INDEX team_strategy_history_adoption_date (adoption_date DESC)
);

-- Estratégias globais (desenvolvidas pela organização)
CREATE TABLE IF NOT EXISTS organizational_strategy_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_name TEXT NOT NULL UNIQUE,
  strategy_type TEXT,
  description TEXT NOT NULL,
  source_team_id UUID REFERENCES agent_teams(id), -- qual time descobriu
  discovery_date TIMESTAMP DEFAULT NOW(),
  maturity_level TEXT CHECK (maturity_level IN ('emerging', 'validated', 'proven', 'canonical')),
  global_success_rate FLOAT DEFAULT 0.0,
  adoption_count INT DEFAULT 0, -- em quantos times está adotada
  total_performance_lift FLOAT DEFAULT 0.0,
  tags TEXT[], -- #collaboration, #efficiency, #innovation
  documentation JSONB, -- step-by-step guide
  video_tutorial_url TEXT,
  last_updated_at TIMESTAMP DEFAULT NOW(),

  INDEX org_strategy_library_maturity (maturity_level),
  INDEX org_strategy_library_success (global_success_rate DESC),
  INDEX org_strategy_library_type (strategy_type)
);

-- Combinações de estratégias (sinergias)
CREATE TABLE IF NOT EXISTS strategy_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_a_id UUID NOT NULL REFERENCES team_strategies(id),
  strategy_b_id UUID NOT NULL REFERENCES team_strategies(id),
  synergy_type TEXT, -- 'multiplicative', 'complementary', 'sequential'
  synergy_score FLOAT CHECK (synergy_score BETWEEN 0 AND 2.0), -- >1 = synergistic
  combined_performance_lift FLOAT,
  tested_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  tested_at TIMESTAMP,

  UNIQUE(strategy_a_id, strategy_b_id),
  INDEX strategy_combinations_synergy (synergy_score DESC)
);

-- Recomendações de estratégia por contexto
CREATE TABLE IF NOT EXISTS strategy_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  strategy_id UUID REFERENCES team_strategies(id),
  recommendation_type TEXT, -- 'adopt', 'experiment', 'avoid', 'combine'
  reason TEXT,
  expected_performance_lift FLOAT,
  confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
  recommended_at TIMESTAMP DEFAULT NOW(),
  action_taken TEXT, -- 'adopted', 'rejected', 'ignored', 'pending'
  action_taken_at TIMESTAMP,

  INDEX strategy_recommendations_team (team_id),
  INDEX strategy_recommendations_recommendation_type (recommendation_type)
);

-- Adaptação de estratégias
CREATE TABLE IF NOT EXISTS strategy_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_strategy_id UUID NOT NULL REFERENCES team_strategies(id),
  adapted_team_id UUID NOT NULL REFERENCES agent_teams(id),
  adaptation_description TEXT,
  changes_made JSONB, -- quais steps foram modificados
  adaptation_success_rate FLOAT,
  original_vs_adapted_delta FLOAT, -- melhoria/piora vs original
  approved_for_library BOOLEAN DEFAULT false,
  adapted_at TIMESTAMP DEFAULT NOW(),

  INDEX strategy_adaptations_team (adapted_team_id),
  INDEX strategy_adaptations_original (original_strategy_id)
);

-- Métricas de saúde de estratégias
CREATE TABLE IF NOT EXISTS strategy_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES team_strategies(id),
  organization_wide_success_rate FLOAT,
  teams_using INT,
  avg_team_improvement FLOAT,
  stale_days INT, -- não validada há quantos dias
  market_relevance FLOAT CHECK (market_relevance BETWEEN 0 AND 1), -- ainda relevante?
  innovation_score FLOAT CHECK (innovation_score BETWEEN 0 AND 1), -- quão inovadora
  last_measured_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(strategy_id),
  INDEX strategy_health_metrics_health (organization_wide_success_rate DESC)
);

-- Eventos de estratégia
CREATE TABLE IF NOT EXISTS strategy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT, -- 'discovered', 'adopted', 'adapted', 'deprecated', 'combined'
  strategy_id UUID,
  team_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX strategy_events_type (event_type),
  INDEX strategy_events_created (created_at DESC)
);
