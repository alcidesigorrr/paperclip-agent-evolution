-- Phase 6: Dynamic Company Structure — Equipes Emergentes e Hierarquias Dinâmicas

-- Table: Agent Teams (times formados dinamicamente)
CREATE TABLE IF NOT EXISTS agent_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  team_type TEXT NOT NULL,          -- 'task_force', 'specialty_team', 'cross_functional'
  leader_agent_id TEXT NOT NULL,    -- quem lidera
  purpose TEXT,                     -- por que existe
  specialization JSONB,             -- {pillar: "cases", focus: [...]}
  members JSONB,                    -- [{agent_id, role, joined_at}, ...]
  performance_score FLOAT,          -- 0-1: effectiveness of team
  is_active BOOLEAN DEFAULT true,
  formation_reason TEXT,            -- "high engagement in cases pillar"
  dissolved_reason TEXT,            -- if dissolved
  created_at TIMESTAMP DEFAULT NOW(),
  dissolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_leader ON agent_teams(leader_agent_id);
CREATE INDEX IF NOT EXISTS idx_teams_active ON agent_teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_type ON agent_teams(team_type);

-- Table: Agent Roles (papéis dentro de times)
CREATE TABLE IF NOT EXISTS agent_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  team_id UUID REFERENCES agent_teams(id) ON DELETE CASCADE,
  role_name TEXT,                   -- 'leader', 'specialist', 'support', 'learner'
  responsibility TEXT,              -- what they do in team
  success_rate FLOAT,               -- success in this role
  is_current BOOLEAN DEFAULT true,
  promoted_from_role TEXT,          -- where they came from
  promoted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_agent ON agent_roles(agent_id);
CREATE INDEX IF NOT EXISTS idx_roles_team ON agent_roles(team_id);

-- Table: Synergy Analysis (compatibility entre agentes)
CREATE TABLE IF NOT EXISTS agent_synergy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a_id TEXT NOT NULL,
  agent_b_id TEXT NOT NULL,
  synergy_score FLOAT,              -- 0-1: how well they work together
  successful_collaborations INT,    -- times worked together successfully
  total_collaborations INT,         -- total times worked together
  collaboration_type TEXT,          -- 'content_creation', 'design+copywriting', etc
  last_collaborated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE COMPOSITE INDEX idx_synergy_pair ON agent_synergy(agent_a_id, agent_b_id);
CREATE INDEX IF NOT EXISTS idx_synergy_score ON agent_synergy(synergy_score DESC);

-- Table: Structure Evolution Log (audit trail)
CREATE TABLE IF NOT EXISTS structure_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT,                 -- 'team_formed', 'team_dissolved', 'role_changed', 'hierarchy_shift'
  description TEXT,
  affected_agents JSONB,           -- list of agents affected
  reason TEXT,                     -- why this happened
  performance_before FLOAT,        -- metrics before event
  performance_after FLOAT,         -- metrics after
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_structure_events_type ON structure_events(event_type);

-- Table: Hierarchies (organizational levels)
CREATE TABLE IF NOT EXISTS organizational_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hierarchy_level INT,             -- 1=individual, 2=team, 3=division, etc
  parent_unit_id UUID,             -- parent team/hierarchy
  unit_id UUID,                    -- team ID or agent ID
  unit_type TEXT,                  -- 'agent', 'team', 'division'
  authority_level FLOAT,           -- 0-1: decision-making authority
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_level ON organizational_hierarchy(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_hierarchy_unit ON organizational_hierarchy(unit_id);

-- Table: Promotions (track career progression)
CREATE TABLE IF NOT EXISTS agent_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  old_role TEXT,                   -- what they were
  new_role TEXT,                   -- what they became
  reason TEXT,                     -- why promoted (performance, expertise, etc)
  old_team_id UUID,
  new_team_id UUID,
  effectiveness_increase FLOAT,    -- % improvement after promotion
  promoted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_agent ON agent_promotions(agent_id);

-- Enable RLS
ALTER TABLE agent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_synergy ENABLE ROW LEVEL SECURITY;
ALTER TABLE structure_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizational_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_promotions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow service role access" ON agent_teams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_synergy
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON structure_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON organizational_hierarchy
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_promotions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
