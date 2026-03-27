-- Migration: 0003_ideas
-- Ideias de sites da comunidade

CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, approved, closed
  suggested_by TEXT REFERENCES users(id),
  claimed_by TEXT REFERENCES users(id),
  claimed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE idea_features (
  id TEXT PRIMARY KEY,
  idea_id TEXT REFERENCES ideas(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE idea_votes (
  id TEXT PRIMARY KEY,
  idea_id TEXT REFERENCES ideas(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER CHECK (value IN (-1, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(idea_id, user_id)
);

CREATE TABLE idea_comments (
  id TEXT PRIMARY KEY,
  idea_id TEXT REFERENCES ideas(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX idx_idea_features_idea_id ON idea_features(idea_id);
CREATE INDEX idx_idea_comments_idea_id ON idea_comments(idea_id);
