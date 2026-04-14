-- Phase 9: Emergent Hierarchies
-- Times sênior gerenciam times juniores, hierarquia emerge dinamicamente

-- Hierarquia entre times
CREATE TABLE IF NOT EXISTS team_hierarchies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_team_id UUID REFERENCES agent_teams(id),
  child_team_id UUID NOT NULL REFERENCES agent_teams(id),
  hierarchy_level INT DEFAULT 1, -- 1=top, 2=mid, 3=junior
  relationship_type TEXT, -- 'supervision', 'mentorship', 'collaboration'
  parent_provides TEXT[], DEFAULT ARRAY[]::TEXT[], -- 'direction', 'resources', 'training'
  authority_delegation FLOAT DEFAULT 0.7 CHECK (authority_delegation BETWEEN 0 AND 1), -- % de autonomia do child
  established_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(parent_team_id, child_team_id),
  INDEX team_hierarchies_parent (parent_team_id),
  INDEX team_hierarchies_child (child_team_id),
  INDEX team_hierarchies_level (hierarchy_level)
);

-- Autoridade do time (capacidade de tomar decisões)
CREATE TABLE IF NOT EXISTS team_authority_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES agent_teams(id),
  base_authority FLOAT DEFAULT 0.5 CHECK (base_authority BETWEEN 0 AND 1),
  performance_authority FLOAT DEFAULT 0.0, -- boost baseado em performance
  seniority_authority FLOAT DEFAULT 0.0, -- boost por senioridade/hierarquia
  delegation_authority FLOAT DEFAULT 0.0, -- boost por delegação de superior
  total_authority FLOAT GENERATED ALWAYS AS (
    LEAST(1.0, base_authority + performance_authority + seniority_authority + delegation_authority)
  ) STORED,
  decision_scope TEXT[], -- tipos de decisão que pode tomar
  escalation_threshold FLOAT DEFAULT 0.7, -- se complexidade > isso, precisa escalar
  last_recalculated_at TIMESTAMP DEFAULT NOW(),

  INDEX team_authority_levels_team (team_id)
);

-- Alocação de recursos entre times
CREATE TABLE IF NOT EXISTS team_resource_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_team_id UUID NOT NULL REFERENCES agent_teams(id),
  to_team_id UUID NOT NULL REFERENCES agent_teams(id),
  resource_type TEXT NOT NULL, -- 'specialist_time', 'knowledge_sharing', 'infrastructure'
  quantity FLOAT,
  unit TEXT, -- 'hours', 'items', 'percentage'
  duration_days INT,
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1=critical, 10=nice-to-have
  justification TEXT,
  approved_by_team_id UUID, -- qual time aprovou a alocação
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  allocated_at TIMESTAMP,
  completed_at TIMESTAMP,
  actual_impact JSONB, -- {performance_delta, time_spent, outcome}
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX team_resource_allocation_from (from_team_id),
  INDEX team_resource_allocation_to (to_team_id),
  INDEX team_resource_allocation_status (status)
);

-- Escalação de decisões para níveis superiores
CREATE TABLE IF NOT EXISTS team_decision_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_team_id UUID NOT NULL REFERENCES agent_teams(id),
  parent_team_id UUID REFERENCES agent_teams(id),
  decision_id UUID REFERENCES team_decisions(id),
  escalation_reason TEXT NOT NULL, -- 'complexity_exceeded', 'resource_needed', 'cross_team_impact'
  original_complexity INT, -- 1-10
  escalation_urgency INT, -- 1-10
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'escalated_further')),
  parent_decision_id UUID, -- se parent criou uma nova decision
  escalated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  INDEX team_decision_escalations_source (source_team_id),
  INDEX team_decision_escalations_parent (parent_team_id),
  INDEX team_decision_escalations_status (status)
);

-- Métricas de hierarquia
CREATE TABLE IF NOT EXISTS team_hierarchy_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  hierarchy_depth INT, -- quão profundo na hierarquia (1=top)
  subordinate_teams INT, -- quantos times reportam (direto ou indireto)
  decisions_escalated_to_parent INT DEFAULT 0,
  decisions_made_autonomously INT DEFAULT 0,
  autonomy_ratio FLOAT, -- autonomy / total decisions
  resource_dependency_ratio FLOAT, -- quão dependente de superiores
  leadership_effectiveness FLOAT CHECK (leadership_effectiveness BETWEEN 0 AND 1), -- como os subordinados avaliam
  last_measured_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(team_id),
  INDEX team_hierarchy_metrics_team (team_id)
);

-- Evolução da hierarquia (histórico)
CREATE TABLE IF NOT EXISTS team_hierarchy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'hierarchy_formed', 'team_promoted', 'authority_increased', 'escalation_handled'
  parent_team_id UUID,
  child_team_id UUID,
  team_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX team_hierarchy_events_type (event_type),
  INDEX team_hierarchy_events_created (created_at)
);

-- Competência de liderança dos times
CREATE TABLE IF NOT EXISTS team_leadership_competence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES agent_teams(id),
  leadership_style TEXT, -- 'democratic', 'directive', 'coaching', 'delegative'
  decision_quality_score FLOAT CHECK (decision_quality_score BETWEEN 0 AND 1), -- qualidade das decisões que o time faz
  member_satisfaction FLOAT CHECK (member_satisfaction BETWEEN 1 AND 5),
  conflict_resolution_ability FLOAT CHECK (conflict_resolution_ability BETWEEN 0 AND 1),
  strategic_thinking FLOAT CHECK (strategic_thinking BETWEEN 0 AND 1),
  delegation_ability FLOAT CHECK (delegation_ability BETWEEN 0 AND 1),
  team_development_focus FLOAT CHECK (team_development_focus BETWEEN 0 AND 1), -- quanto investe em crescimento dos membros
  readiness_for_greater_authority FLOAT GENERATED ALWAYS AS (
    (decision_quality_score + member_satisfaction / 5.0 + conflict_resolution_ability + strategic_thinking) / 4.0
  ) STORED,
  last_assessed_at TIMESTAMP DEFAULT NOW(),

  INDEX team_leadership_competence_team (team_id),
  INDEX team_leadership_competence_readiness (readiness_for_greater_authority DESC)
);
