-- Phase 11: Creative Generation & Ideation
-- Sistema gera ideias criativas via Claude + feedback loop automático

-- Ideias geradas (humanas ou IA)
CREATE TABLE IF NOT EXISTS creative_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT CHECK (source_type IN ('human_input', 'ai_generated', 'hybrid')),
  topic TEXT NOT NULL,
  idea_description TEXT NOT NULL,
  theme TEXT,
  suggested_format TEXT, -- 'carousel', 'video', 'article', 'static_image', etc
  ai_confidence FLOAT CHECK (ai_confidence BETWEEN 0 AND 1),
  human_approval BOOLEAN DEFAULT FALSE,
  created_by TEXT, -- 'Igor', 'System', agent_id
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX creative_ideas_topic (topic),
  INDEX creative_ideas_created_at (created_at DESC),
  INDEX creative_ideas_source (source_type)
);

-- Feedback dos agentes em ideias
CREATE TABLE IF NOT EXISTS idea_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES creative_ideas(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  vote TEXT CHECK (vote IN ('like', 'dislike', 'neutral')),
  reasoning TEXT,
  predicted_engagement FLOAT,
  actual_engagement FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idea_feedback_idea (idea_id),
  INDEX idea_feedback_agent (agent_id),
  INDEX idea_feedback_vote (vote)
);

-- Performance de cada ideia (após execução)
CREATE TABLE IF NOT EXISTS idea_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES creative_ideas(id) ON DELETE CASCADE,
  executed_count INT DEFAULT 0,
  avg_engagement FLOAT DEFAULT 0.0,
  engagement_variance FLOAT DEFAULT 0.0,
  roi_estimate FLOAT DEFAULT 0.0,
  last_measured_at TIMESTAMP,

  INDEX idea_performance_idea (idea_id),
  UNIQUE(idea_id)
);

-- Sessões de brainstorm com Claude AI
CREATE TABLE IF NOT EXISTS ai_brainstorms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  num_ideas_generated INT DEFAULT 0,
  ideas_selected INT DEFAULT 0,
  total_engagement FLOAT DEFAULT 0.0,
  ai_model_used TEXT DEFAULT 'claude-opus',
  api_cost FLOAT DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX ai_brainstorms_topic (topic),
  INDEX ai_brainstorms_created (created_at DESC)
);

-- Padrões de sucesso descobertos
CREATE TABLE IF NOT EXISTS creative_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  successful_ideas_count INT DEFAULT 0,
  avg_engagement FLOAT DEFAULT 0.0,
  topics_where_works TEXT[], -- 'sustainability', 'innovation', 'case_study', etc
  formats_where_works TEXT[], -- 'carousel', 'video', etc
  confidence FLOAT DEFAULT 0.0,
  discovered_at TIMESTAMP DEFAULT NOW(),

  INDEX creative_patterns_confidence (confidence DESC),
  UNIQUE(pattern_name)
);
