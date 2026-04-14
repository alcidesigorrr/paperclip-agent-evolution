-- Phase 5: Self-Improving Evaluation — Agentes Aprendem com Feedback

-- Table: Feedback Results (resultado de cada tarefa/decisão)
CREATE TABLE IF NOT EXISTS feedback_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT NOT NULL,              -- tarefa original
  agent_id TEXT NOT NULL,              -- agente que executou
  decision_id UUID,                    -- se foi resultado de votação
  task_type TEXT,                      -- 'content_creation', 'design', 'strategy'
  metric_type TEXT,                    -- 'engagement', 'quality', 'time', 'cmo_rating'
  expected_value FLOAT,                -- o que esperávamos
  actual_value FLOAT,                  -- o que conseguimos
  success_percentage FLOAT,            -- (actual/expected) * 100
  feedback_text TEXT,                  -- CMO feedback direto
  status TEXT DEFAULT 'pending',       -- 'pending', 'evaluated', 'learned'
  created_at TIMESTAMP DEFAULT NOW(),
  evaluated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_agent ON feedback_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_issue ON feedback_results(issue_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_results(status);

-- Table: Agent Learning Patterns (o que agente aprendeu fazer bem)
CREATE TABLE IF NOT EXISTS agent_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,             -- 'content_creation', 'design', etc
  pattern TEXT NOT NULL,               -- "posts com emoji têm 2x engagement"
  pattern_category TEXT,               -- 'format', 'style', 'timing', 'audience'
  confidence FLOAT,                    -- 0-1: quão confiante estamos neste padrão
  times_validated INT DEFAULT 1,       -- quantas vezes este padrão foi confirmado
  first_discovered_at TIMESTAMP,
  last_validated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patterns_agent ON agent_learning_patterns(agent_id, task_type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON agent_learning_patterns(confidence DESC);

-- Table: Performance Degradation Alerts (detecta quando agente piora)
CREATE TABLE IF NOT EXISTS performance_degradation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  task_type TEXT,
  previous_avg_score FLOAT,            -- avg das últimas 5 tarefas
  current_avg_score FLOAT,             -- avg das últimas 2 tarefas
  degradation_percentage FLOAT,        -- quanto piorou (%)
  probable_cause TEXT,                 -- "muito cansado?", "instrução mudou?", etc
  status TEXT DEFAULT 'alert',         -- 'alert', 'acknowledged', 'resolved'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_degradation_agent ON performance_degradation(agent_id);
CREATE INDEX IF NOT EXISTS idx_degradation_status ON performance_degradation(status);

-- Table: Agent Learning Events (log de cada aprendizado)
CREATE TABLE IF NOT EXISTS learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  event_type TEXT,                    -- 'pattern_discovered', 'accuracy_improved', 'issue_detected'
  description TEXT,
  old_value FLOAT,                    -- antes (accuracy, confidence, etc)
  new_value FLOAT,                    -- depois
  impact_score FLOAT,                 -- 0-1: quão importante é este aprendizado
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_agent ON learning_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_learning_type ON learning_events(event_type);

-- Table: Recommendation Queue (recomendações geradas pra CMO)
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT,
  agent_id TEXT,
  recommendation_type TEXT,           -- 'task_assignment', 'skill_development', 'process_change', 'agent_pairing'
  title TEXT,
  description TEXT,
  reasoning TEXT,                     -- por que estamos fazendo essa recomendação
  confidence FLOAT,                   -- 0-1: confiança na recomendação
  potential_impact TEXT,              -- "engagement +15%", "time -20%", etc
  status TEXT DEFAULT 'pending',      -- 'pending', 'accepted', 'rejected', 'implemented'
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_agent ON ai_recommendations(agent_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON ai_recommendations(status);

-- Table: Agent Skill Assessment (avaliação de skills)
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,           -- 'copywriting', 'design', 'seo', 'engagement_tactics'
  proficiency_level FLOAT,            -- 0-1: quão bom neste skill
  times_used INT DEFAULT 0,
  success_rate FLOAT,                 -- 0-1: % de vezes que funcionou bem
  last_used_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_skills_proficiency ON agent_skills(proficiency_level DESC);

-- Enable RLS
ALTER TABLE feedback_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_degradation ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow service role access" ON feedback_results
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_learning_patterns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON performance_degradation
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON learning_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON ai_recommendations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_skills
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
