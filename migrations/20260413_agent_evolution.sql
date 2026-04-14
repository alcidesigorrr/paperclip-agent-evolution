-- Phase 1: Agent Evolution Foundation
-- Agent Memory + Self-Evaluation

-- Table 1: Agent Learnings (o que cada agente aprendeu)
CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'client_voice', 'forbidden_terms', 'best_practice', 'skill', 'style'
  content TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.5, -- 0-1, cresce conforme confirmado
  source TEXT DEFAULT 'observed', -- 'observed', 'feedback', 'derived'
  derived_from_posts UUID[] DEFAULT '{}', -- quais posts geraram isso?
  last_confirmed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_learnings_agent_id ON agent_learnings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_category ON agent_learnings(category);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_confidence ON agent_learnings(confidence DESC);

-- Table 2: Agent Evaluations (auto-avaliação de agente)
CREATE TABLE IF NOT EXISTS agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL, -- issue Paperclip ID
  evaluation_criteria TEXT, -- qual tipo de task? ('design', 'copy', 'content_html')
  self_score FLOAT, -- 1-10, agente avalia seu próprio trabalho
  evaluation_json JSONB, -- { "strengths": [...], "weaknesses": [...], "learnings": [...] }
  work_submitted TEXT, -- o conteúdo que foi avaliado (truncado se muito grande)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_agent_id ON agent_evaluations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_task_id ON agent_evaluations(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_score ON agent_evaluations(self_score DESC);

-- Table 3: Agent Performance Snapshot (resumo semanal por agente)
CREATE TABLE IF NOT EXISTS agent_performance_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  week_number INT,
  posts_created INT DEFAULT 0,
  avg_self_score FLOAT, -- média das auto-avaliações na semana
  top_strength TEXT, -- melhor coisa que fez
  top_weakness TEXT, -- coisa pra melhorar
  learned_this_week TEXT[], -- insights importantes
  performance_metrics JSONB, -- { engagement: 0.045, conversion: 0.023, etc }
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance_snapshot(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_week ON agent_performance_snapshot(week_number DESC);

-- Table 4: Agent Memory Context (guardado em memoria, recuperado antes de issue)
CREATE TABLE IF NOT EXISTS agent_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  memory_context TEXT, -- compilado de agent_learnings + recent performance
  last_updated TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- renovar a cada 7 dias
);

CREATE INDEX IF NOT EXISTS idx_agent_context_agent_id ON agent_context_cache(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_expires ON agent_context_cache(expires_at);

-- Enable RLS (opcional, mas recomendado)
ALTER TABLE agent_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context_cache ENABLE ROW LEVEL SECURITY;

-- Policies (permitir INSERT/SELECT pra aplicação)
CREATE POLICY "Allow service role access" ON agent_learnings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_evaluations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_performance_snapshot
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_context_cache
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
