-- Phase 13: Market Intelligence & Trend Detection
-- Sistema detecta tendências de mercado em tempo real e cria oportunidades

-- Tendências detectadas
CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_name TEXT NOT NULL,
  source TEXT CHECK (source IN ('twitter', 'google_trends', 'news', 'news_api', 'social_media')),
  relevance_score FLOAT CHECK (relevance_score BETWEEN 0 AND 1),
  volume_change_pct FLOAT, -- mudança em volume (ex: +15%)
  competitor_mentions INT DEFAULT 0,
  industry_relevance TEXT, -- qual indústria afeta
  discovered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,

  INDEX market_trends_relevance (relevance_score DESC),
  INDEX market_trends_source (source),
  INDEX market_trends_discovered (discovered_at DESC)
);

-- Oportunidades criadas baseadas em tendências
CREATE TABLE IF NOT EXISTS trend_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES market_trends(id) ON DELETE CASCADE,
  opportunity_type TEXT CHECK (opportunity_type IN ('content', 'campaign', 'positioning', 'partnership')),
  suggested_action TEXT NOT NULL,
  expected_engagement_lift FLOAT, -- quanto % de engagement esperado
  time_to_execute INT, -- em minutos
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  proposed_by TEXT DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX trend_opportunities_trend (trend_id),
  INDEX trend_opportunities_urgency (urgency_level),
  INDEX trend_opportunities_type (opportunity_type)
);

-- Reações dos agentes a oportunidades
CREATE TABLE IF NOT EXISTS trend_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES trend_opportunities(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('accepted', 'declined', 'modified')),
  execution_time INT, -- tempo que levou pra executar em minutos
  actual_engagement_lift FLOAT, -- engagement real após execução
  roi_estimate FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX trend_reactions_opportunity (opportunity_id),
  INDEX trend_reactions_agent (agent_id),
  INDEX trend_reactions_decision (decision)
);

-- Histórico de tendências exploradas
CREATE TABLE IF NOT EXISTS trend_exploitation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES market_trends(id) ON DELETE CASCADE,
  exploitation_count INT DEFAULT 0,
  successful_exploitations INT DEFAULT 0,
  total_engagement FLOAT DEFAULT 0.0,
  avg_time_to_market INT, -- tempo médio pra reagir em minutos
  last_exploited_at TIMESTAMP,

  INDEX trend_exploitation_history_trend (trend_id),
  UNIQUE(trend_id)
);

-- Padrões de sucesso em trend capture
CREATE TABLE IF NOT EXISTS trend_success_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  trend_category TEXT, -- 'sustainability', 'tech', 'health', etc
  successful_exploitations INT DEFAULT 0,
  avg_engagement_lift FLOAT DEFAULT 0.0,
  typical_time_window INT, -- minutos até trend expirar
  confidence FLOAT DEFAULT 0.0,
  discovered_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(pattern_name)
);
