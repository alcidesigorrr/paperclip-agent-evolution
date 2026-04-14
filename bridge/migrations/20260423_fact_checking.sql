-- Phase 12: Fact-Checking & Accuracy Verification
-- Sistema verifica acurácia de claims usando múltiplas fontes

-- Fact claims (asserções feitas pelos agentes)
CREATE TABLE IF NOT EXISTS fact_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_text TEXT NOT NULL,
  source_agent TEXT NOT NULL,
  claim_category TEXT CHECK (claim_category IN ('statistic', 'comparison', 'process', 'opinion', 'quote')),
  context_text TEXT, -- contexto onde a claim foi feita
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX fact_claims_agent (source_agent),
  INDEX fact_claims_category (claim_category),
  INDEX fact_claims_created (created_at DESC)
);

-- Verificação de claims em múltiplas fontes
CREATE TABLE IF NOT EXISTS fact_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES fact_claims(id) ON DELETE CASCADE,
  source_type TEXT CHECK (source_type IN ('website', 'google_search', 'api', 'news', 'expert', 'document')),
  source_name TEXT,
  finding TEXT, -- o que foi encontrado
  confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
  verified_at TIMESTAMP DEFAULT NOW(),

  INDEX fact_verification_claim (claim_id),
  INDEX fact_verification_source (source_type),
  INDEX fact_verification_confidence (confidence DESC)
);

-- Veredicto final sobre uma claim
CREATE TABLE IF NOT EXISTS fact_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES fact_claims(id) ON DELETE CASCADE,
  verdict TEXT CHECK (verdict IN ('approved', 'rejected', 'needs_context', 'opinion', 'unverifiable')),
  consensus_confidence FLOAT DEFAULT 0.0,
  suggested_rewording TEXT, -- sugestão de como reformular a claim
  final_decision_by TEXT, -- 'system' ou agent_id
  reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX fact_verdicts_claim (claim_id),
  INDEX fact_verdicts_verdict (verdict),
  INDEX fact_verdicts_confidence (consensus_confidence DESC)
);

-- Estatísticas de acurácia por agente
CREATE TABLE IF NOT EXISTS accuracy_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  claims_made INT DEFAULT 0,
  verified_claims INT DEFAULT 0,
  approved_claims INT DEFAULT 0,
  rejected_claims INT DEFAULT 0,
  accuracy_rate FLOAT DEFAULT 0.0,
  last_measured_at TIMESTAMP,

  INDEX accuracy_stats_agent (agent_id),
  INDEX accuracy_stats_rate (accuracy_rate DESC)
);

-- Padrões de erros comuns
CREATE TABLE IF NOT EXISTS common_claim_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_pattern TEXT NOT NULL UNIQUE,
  error_description TEXT,
  frequency INT DEFAULT 0,
  typical_agents TEXT[],
  suggested_correction TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  last_seen_at TIMESTAMP
);
