-- Phase 4: Consensus Voting & Task Decomposition

-- Table: Decision Points (decisions that need agent consensus)
CREATE TABLE IF NOT EXISTS decision_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id TEXT NOT NULL,           -- link to Paperclip issue
  decision_type TEXT NOT NULL,      -- 'strategy', 'approach', 'priority', 'format'
  question TEXT NOT NULL,           -- "Should this be case study or tip post?"
  context JSONB,                    -- task context, client info, metrics
  required_voters INT DEFAULT 3,    -- minimum votes needed for consensus
  status TEXT DEFAULT 'voting',     -- 'voting', 'consensus_reached', 'tie', 'escalated'
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decision_issue ON decision_points(issue_id);
CREATE INDEX IF NOT EXISTS idx_decision_status ON decision_points(status);

-- Table: Agent Votes (individual votes on decisions)
CREATE TABLE IF NOT EXISTS agent_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decision_points(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,           -- "copywriter_sondar"
  choice TEXT NOT NULL,             -- the option voted for
  confidence FLOAT,                 -- 0-1: how confident is agent in this choice
  reasoning TEXT,                   -- why did agent choose this
  vote_weight FLOAT DEFAULT 1.0,    -- weighted by agent's past accuracy in this domain
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votes_decision ON agent_votes(decision_id);
CREATE INDEX IF NOT EXISTS idx_votes_agent ON agent_votes(agent_id);

-- Table: Vote Consensus Results
CREATE TABLE IF NOT EXISTS vote_consensus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL UNIQUE REFERENCES decision_points(id),
  winning_choice TEXT NOT NULL,    -- most voted option
  total_votes INT,
  winning_votes INT,               -- how many voted for winner
  consensus_confidence FLOAT,      -- 0-1: strength of consensus
  all_votes JSONB,                 -- {choice: count, ...}
  is_tie BOOLEAN DEFAULT false,    -- true if top 2 choices tied
  cmo_decision TEXT,               -- if tie, CMO picks this
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consensus_decision ON vote_consensus(decision_id);

-- Table: Task Decomposition (complex tasks broken into subtasks)
CREATE TABLE IF NOT EXISTS task_decompositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_issue_id TEXT NOT NULL,    -- original complex task
  complexity_score FLOAT,           -- 0-10: how complex is this task
  decomposition_reason TEXT,        -- why was this decomposed
  subtasks JSONB NOT NULL,          -- [{id, title, assigned_to, priority, dependencies}, ...]
  strategy JSONB,                   -- {approach, phases, success_metrics}
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decomp_parent ON task_decompositions(parent_issue_id);

-- Table: Decision History (track voting patterns over time)
CREATE TABLE IF NOT EXISTS decision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  decision_type TEXT,              -- which type of decisions does this agent excel at
  correct_votes INT DEFAULT 0,     -- times agent's vote led to success
  total_votes INT DEFAULT 0,
  accuracy_score FLOAT,            -- correct / total
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_agent ON decision_history(agent_id, decision_type);

-- Enable RLS
ALTER TABLE decision_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_consensus ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_decompositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow service role access" ON decision_points
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON agent_votes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON vote_consensus
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON task_decompositions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role access" ON decision_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
