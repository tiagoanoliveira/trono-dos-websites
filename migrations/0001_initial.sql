-- Migration: 0001_initial
-- Trono dos Websites — initial schema

-- Utilizadores
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  google_id TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categorias
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  parent_id TEXT REFERENCES categories(id),
  status TEXT DEFAULT 'active',
  suggested_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Websites
CREATE TABLE websites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  screenshot_url TEXT,
  category_id TEXT REFERENCES categories(id),
  status TEXT DEFAULT 'pending',
  submitted_by TEXT REFERENCES users(id),
  featured BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Avaliações
CREATE TABLE ratings (
  id TEXT PRIMARY KEY,
  website_id TEXT REFERENCES websites(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(website_id, user_id)
);

-- Comentários
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  website_id TEXT REFERENCES websites(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id),
  status TEXT DEFAULT 'visible',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comparativos Diários
CREATE TABLE daily_comparisons (
  id TEXT PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  category_id TEXT REFERENCES categories(id),
  website_a_id TEXT REFERENCES websites(id),
  website_b_id TEXT REFERENCES websites(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Votos nos Comparativos
CREATE TABLE comparison_votes (
  id TEXT PRIMARY KEY,
  comparison_id TEXT REFERENCES daily_comparisons(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  voted_for TEXT REFERENCES websites(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comparison_id, user_id)
);

-- Denúncias
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- Sugestões de Categorias
CREATE TABLE category_suggestions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  suggested_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes: websites
CREATE INDEX idx_websites_category_id ON websites(category_id);
CREATE INDEX idx_websites_status ON websites(status);
CREATE INDEX idx_websites_featured ON websites(featured);

-- Indexes: categories
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_status ON categories(status);

-- Indexes: ratings
CREATE INDEX idx_ratings_website_id ON ratings(website_id);

-- Indexes: comments
CREATE INDEX idx_comments_website_id ON comments(website_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
