-- Phase 8: Cross-Team Learning
-- Times de alta performance compartilham padrões bem-sucedidos

-- Melhores práticas extraídas de times bem-sucedidos
CREATE TABLE IF NOT EXISTS team_best_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id UUID NOT NULL REFERENCES agent_teams(id),
  practice_type TEXT NOT NULL, -- 'collaboration_pattern', 'task_decomposition', 'quality_assurance'
  practice_name TEXT NOT NULL,
  description TEXT NOT NULL,
  key_steps JSONB, -- array de steps que fazem funcionar
  success_rate FLOAT DEFAULT 0.0 CHECK (success_rate BETWEEN 0 AND 1),
  times_applied INT DEFAULT 0,
  times_successful INT DEFAULT 0,
  performance_lift FLOAT DEFAULT 0.0, -- quanto a prática melhorou performance (ex: +0.12)
  applicable_to_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- tipos de times que pode aplicar
  required_skills JSONB, -- {skill: proficiency_min}
  prerequisites TEXT,
  complexity_level INT CHECK (complexity_level BETWEEN 1 AND 5), -- 1=simples, 5=muito complexo
  discovered_at TIMESTAMP DEFAULT NOW(),

  INDEX team_best_practices_source (source_team_id),
  INDEX team_best_practices_type (practice_type),
  INDEX team_best_practices_success (success_rate DESC)
);

-- Transferência de conhecimento entre times
CREATE TABLE IF NOT EXISTS team_knowledge_transfer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id UUID NOT NULL REFERENCES agent_teams(id),
  target_team_id UUID NOT NULL REFERENCES agent_teams(id),
  practice_id UUID NOT NULL REFERENCES team_best_practices(id),
  transfer_type TEXT, -- 'coaching_session', 'documentation', 'observation', 'joint_execution'
  proposed_by TEXT, -- agent_id que propôs
  proposed_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  transfer_status TEXT DEFAULT 'proposed' CHECK (transfer_status IN ('proposed', 'accepted', 'in_progress', 'completed', 'failed')),
  notes TEXT,

  INDEX team_knowledge_transfer_source (source_team_id),
  INDEX team_knowledge_transfer_target (target_team_id),
  INDEX team_knowledge_transfer_status (transfer_status)
);

-- Adoção de práticas em novo contexto
CREATE TABLE IF NOT EXISTS team_practice_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  practice_id UUID NOT NULL REFERENCES team_best_practices(id),
  adoption_status TEXT DEFAULT 'experimental' CHECK (adoption_status IN ('experimental', 'trial', 'adopted', 'abandoned')),
  adaptation_made TEXT, -- como foi adaptada pro contexto local
  baseline_performance FLOAT, -- performance antes da adoção
  current_performance FLOAT, -- performance depois
  performance_delta FLOAT, -- variação (pode ser negativo)
  cycles_tested INT DEFAULT 0,
  success_count INT DEFAULT 0, -- quantas vezes funcionou bem
  failure_count INT DEFAULT 0,
  adoption_confidence FLOAT DEFAULT 0.0,
  started_at TIMESTAMP DEFAULT NOW(),
  last_measured_at TIMESTAMP,
  abandoned_at TIMESTAMP,
  abandonment_reason TEXT,

  UNIQUE(team_id, practice_id),
  INDEX team_practice_adoption_team (team_id),
  INDEX team_practice_adoption_status (adoption_status)
);

-- Impacto da transferência de conhecimento
CREATE TABLE IF NOT EXISTS team_learning_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id UUID NOT NULL,
  target_team_id UUID NOT NULL,
  practice_id UUID NOT NULL REFERENCES team_best_practices(id),
  measurement_period_days INT DEFAULT 7,
  original_team_performance FLOAT,
  target_team_before FLOAT,
  target_team_after FLOAT,
  performance_lift FLOAT,
  knowledge_adoption_rate FLOAT CHECK (knowledge_adoption_rate BETWEEN 0 AND 1), -- % do time que adotou
  team_satisfaction FLOAT CHECK (team_satisfaction BETWEEN 1 AND 5), -- 1=bad, 5=great
  member_engagement_change FLOAT, -- variação no engajamento
  measured_at TIMESTAMP DEFAULT NOW(),

  INDEX team_learning_impact_source (source_team_id),
  INDEX team_learning_impact_target (target_team_id)
);

-- Padrões de aprendizado coletivo
CREATE TABLE IF NOT EXISTS team_learning_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_id UUID NOT NULL,
  team_b_id UUID NOT NULL,
  collaboration_count INT DEFAULT 0, -- quantas práticas foram compartilhadas
  total_knowledge_transferred INT DEFAULT 0, -- cumulative learning events
  mutual_benefit_score FLOAT DEFAULT 0.0, -- ambas aprenderam?
  last_interaction_at TIMESTAMP,

  UNIQUE(team_a_id, team_b_id),
  INDEX team_learning_networks_a (team_a_id),
  INDEX team_learning_networks_b (team_b_id)
);

-- Auditoria de aprendizado
CREATE TABLE IF NOT EXISTS team_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'practice_discovered', 'transfer_proposed', 'adoption_started', 'adoption_completed'
  source_team_id UUID,
  target_team_id UUID,
  practice_id UUID,
  agent_id TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX team_learning_events_type (event_type),
  INDEX team_learning_events_created (created_at)
);
