-- Phase 14: Positioning & Messaging Strategy
-- Sistema define e mantém estratégia de posicionamento unificada

-- Posicionamento de mercado
CREATE TABLE IF NOT EXISTS market_positioning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  target_market TEXT,
  unique_value_proposition TEXT NOT NULL,
  primary_positioning TEXT NOT NULL, -- como empresa quer ser conhecida
  competitive_advantages TEXT[], -- vs competitors
  customer_pain_points TEXT[], -- problemas que resolve
  market_perception_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP,

  INDEX market_positioning_updated (last_updated_at DESC)
);

-- Pilares de mensagem
CREATE TABLE IF NOT EXISTS messaging_pillars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  positioning_id UUID NOT NULL REFERENCES market_positioning(id) ON DELETE CASCADE,
  pillar_name TEXT NOT NULL,
  pillar_description TEXT,
  supporting_points TEXT[],
  recommended_tone TEXT, -- 'professional', 'friendly', 'expert', 'innovative'
  usage_frequency INT DEFAULT 0,
  effectiveness_score FLOAT DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX messaging_pillars_positioning (positioning_id)
);

-- Alinhamento de marca
CREATE TABLE IF NOT EXISTS brand_alignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  positioning_id UUID NOT NULL REFERENCES market_positioning(id) ON DELETE CASCADE,
  content_piece_id TEXT, -- referência a post/artigo
  pillar_id UUID REFERENCES messaging_pillars(id),
  alignment_score FLOAT CHECK (alignment_score BETWEEN 0 AND 1),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX brand_alignment_positioning (positioning_id),
  INDEX brand_alignment_score (alignment_score DESC)
);

-- Performance de posicionamento
CREATE TABLE IF NOT EXISTS positioning_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  positioning_id UUID NOT NULL REFERENCES market_positioning(id) ON DELETE CASCADE,
  measurement_period TEXT, -- 'week', 'month', 'quarter'
  brand_awareness_lift FLOAT,
  consideration_lift FLOAT,
  preference_lift FLOAT,
  market_share_change FLOAT,
  brand_value_estimate FLOAT,
  measured_at TIMESTAMP DEFAULT NOW(),

  INDEX positioning_performance_positioning (positioning_id),
  INDEX positioning_performance_measured (measured_at DESC)
);
