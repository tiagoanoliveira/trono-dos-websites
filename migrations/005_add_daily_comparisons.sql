CREATE TABLE IF NOT EXISTS daily_comparisons (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  website_a_id TEXT NOT NULL REFERENCES websites(id),
  website_b_id TEXT NOT NULL REFERENCES websites(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_comparisons_date ON daily_comparisons(date);
CREATE INDEX IF NOT EXISTS idx_daily_comparisons_category ON daily_comparisons(category_id);

CREATE TABLE IF NOT EXISTS comparison_votes (
  id TEXT PRIMARY KEY,
  comparison_id TEXT NOT NULL REFERENCES daily_comparisons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  voted_for TEXT NOT NULL REFERENCES websites(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comparison_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comparison_votes_comparison ON comparison_votes(comparison_id);
CREATE INDEX IF NOT EXISTS idx_comparison_votes_user ON comparison_votes(user_id);
