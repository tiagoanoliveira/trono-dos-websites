CREATE TABLE IF NOT EXISTS idea_feature_votes (
  id TEXT PRIMARY KEY,
  feature_id TEXT NOT NULL REFERENCES idea_features(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_feature_votes_feature ON idea_feature_votes(feature_id);
CREATE INDEX IF NOT EXISTS idx_idea_feature_votes_user ON idea_feature_votes(user_id);
