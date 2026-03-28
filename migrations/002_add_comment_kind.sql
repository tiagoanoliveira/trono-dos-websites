-- Categorize comments (opinião, sugestão, erro, elogio, etc.)
ALTER TABLE comments
ADD COLUMN kind TEXT DEFAULT 'general';
