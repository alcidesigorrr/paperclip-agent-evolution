-- Phase 3: Agent Forking — Specialization & Dynamic Agent Creation

-- Table: Agent Forks (track specialized agents)
CREATE TABLE IF NOT EXISTS agent_forks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_agent_id TEXT NOT NULL,  -- "copywriter_sondar"
  fork_name TEXT NOT NULL UNIQUE, -- "copywriter_cases_specialist"
  specialization JSONB NOT NULL,  -- {pillar: "cases", focus_on: [...], exclude_from: [...]}
  refined_instructions TEXT,      -- Custom AGENTS.md content
  is_active BOOLEAN DEFAULT true,
  contract_duration_weeks INT,    -- NULL = indefinite, 4 = 4-week trial
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  archived_reason TEXT            -- "Merged back to parent", "Low performance", etc
);

CREATE INDEX IF NOT EXISTS idx_agent_forks_parent ON agent_forks(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_forks_active ON agent_forks(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_forks_name ON agent_forks(fork_name);

-- Table: Specialization Suggestions (suggestions for CMO to approve/reject)
CREATE TABLE IF NOT EXISTS specialization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_agent_id TEXT NOT NULL,
  suggested_fork_name TEXT,
  specialization JSONB,           -- proposed specialization
  reasoning TEXT,                 -- why we suggest this fork
  performance_data JSONB,         -- variance metrics that triggered suggestion
  confidence FLOAT,               -- 0-1: how confident are we in this suggestion
  status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'implemented'
  approved_by_agent TEXT,         -- agent ID of who approved (CMO)
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_parent ON specialization_suggestions(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON specialization_suggestions(status);

-- Table: Agent Performance by Category (for specialization detection)
CREATE TABLE IF NOT EXISTS agent_performance_by_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  category TEXT NOT NULL,         -- 'pillar', 'type', 'client_segment'
  category_value TEXT NOT NULL,   -- "cases_resultados", "instagram_post", "enterprise"
  week_number INT,
  avg_score FLOAT,
  post_count INT,
  engagement_avg FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_category_agent ON agent_performance_by_category(agent_id, category);
CREATE INDEX IF NOT EXISTS idx_perf_category_week ON agent_performance_by_category(week_number DESC);

-- Enable RLS
ALTER TABLE agent_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialization_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_by_category ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow service role access" ON agent_forks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON specialization_suggestions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_performance_by_category
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
