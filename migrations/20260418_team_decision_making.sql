-- Phase 7: Team Decision Making
-- Times votam em decisões, retroalimenta performance

-- Decisões pendentes de votação do time
CREATE TABLE IF NOT EXISTS team_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  decision_type TEXT NOT NULL, -- 'task_approach', 'resource_allocation', 'member_assignment'
  question TEXT NOT NULL,
  context JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'voting', 'resolved', 'deadlocked')),
  required_voters INT DEFAULT 2,
  leader_breakable BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,

  INDEX team_decisions_team_id (team_id),
  INDEX team_decisions_status (status),
  INDEX team_decisions_created (created_at)
);

-- Votos individuais dos membros do time
CREATE TABLE IF NOT EXISTS team_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES team_decisions(id),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  agent_id TEXT NOT NULL,
  choice TEXT NOT NULL, -- 'yes', 'no', 'abstain'
  confidence FLOAT DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  reasoning TEXT,
  vote_weight FLOAT DEFAULT 1.0, -- baseado em expertise do agente pro tipo de decisão
  submitted_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(decision_id, agent_id),
  INDEX team_votes_decision (decision_id),
  INDEX team_votes_agent (agent_id)
);

-- Resultado agregado da votação
CREATE TABLE IF NOT EXISTS team_vote_consensus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES team_decisions(id),
  team_id UUID NOT NULL,
  consensus_choice TEXT, -- 'yes', 'no', 'abstain'
  yes_score FLOAT DEFAULT 0,
  no_score FLOAT DEFAULT 0,
  abstain_score FLOAT DEFAULT 0,
  total_weight FLOAT DEFAULT 0,
  is_unanimous BOOLEAN DEFAULT false,
  is_deadlocked BOOLEAN DEFAULT false,
  leader_decision_needed BOOLEAN DEFAULT false,
  leader_override_choice TEXT, -- se leader quebrou empate
  resolution_time_seconds INT,
  resolved_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(decision_id),
  INDEX team_vote_consensus_team (team_id)
);

-- Impacto da decisão na performance do time
CREATE TABLE IF NOT EXISTS team_decision_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES team_decisions(id),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  consensus_choice TEXT,
  actual_outcome TEXT, -- 'positive', 'neutral', 'negative'
  outcome_metric FLOAT, -- variação de performance (ex: +0.05)
  outcome_explanation TEXT,
  was_leader_override BOOLEAN DEFAULT false,
  feedback_quality FLOAT, -- 0-1 quanto a retroalimentação foi clara
  decision_importance INT, -- 1-10, impacto potencial
  measured_at TIMESTAMP DEFAULT NOW(),

  INDEX team_decision_impact_team (team_id),
  INDEX team_decision_impact_decision (decision_id)
);

-- Histórico de decisões para melhorar expertise
CREATE TABLE IF NOT EXISTS team_decision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES agent_teams(id),
  agent_id TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  votes_correct INT DEFAULT 0, -- quantas vezes votou certo
  votes_total INT DEFAULT 0,
  voting_accuracy FLOAT DEFAULT 0.0 CHECK (voting_accuracy BETWEEN 0 AND 1),
  expertise_level FLOAT DEFAULT 0.5 CHECK (expertise_level BETWEEN 0 AND 1),
  last_decision_at TIMESTAMP,

  UNIQUE(team_id, agent_id, decision_type),
  INDEX team_decision_history_team (team_id),
  INDEX team_decision_history_agent (agent_id)
);

-- Auditoria de consenso
CREATE TABLE IF NOT EXISTS team_consensus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'decision_created', 'vote_recorded', 'consensus_reached', 'leader_override'
  team_id UUID NOT NULL,
  decision_id UUID NOT NULL,
  agent_id TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX team_consensus_events_team (team_id),
  INDEX team_consensus_events_type (event_type)
);
