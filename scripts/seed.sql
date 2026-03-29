PRAGMA foreign_keys = ON;

-- Users
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES
  ('u-demo', 'demo@trono.local', '00112233445566778899aabbccddeeff:cc31cb43494369b5270bb807dff64994d50e14db3e5b682d69d24f5b0e7b483b', 'Demo User', 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('u-admin', 'admin@trono.local', '00112233445566778899aabbccddeeff:cc31cb43494369b5270bb807dff64994d50e14db3e5b682d69d24f5b0e7b483b', 'Admin User', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('u-joana', 'joana@trono.local', '00112233445566778899aabbccddeeff:cc31cb43494369b5270bb807dff64994d50e14db3e5b682d69d24f5b0e7b483b', 'Joana', 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('u-tiago', 'tiago@trono.local', '00112233445566778899aabbccddeeff:cc31cb43494369b5270bb807dff64994d50e14db3e5b682d69d24f5b0e7b483b', 'Tiago', 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Categories
INSERT OR IGNORE INTO categories (id, name, slug, description, icon, status, created_at)
VALUES
  ('cat-fin', 'Finanças', 'financas', 'Ferramentas de gestão e comparação financeira', '💰', 'active', CURRENT_TIMESTAMP),
  ('cat-viagens', 'Viagens', 'viagens', 'Plataformas de viagens e mobilidade', '✈️', 'active', CURRENT_TIMESTAMP),
  ('cat-produtividade', 'Produtividade', 'produtividade', 'Apps e serviços para produtividade', '⚙️', 'active', CURRENT_TIMESTAMP);

-- Websites
INSERT OR IGNORE INTO websites (id, name, url, description, logo_url, screenshot_url, category_id, status, submitted_by, featured, created_at, updated_at)
VALUES
  ('w-idealista', 'Idealista', 'https://www.idealista.pt', 'Pesquisa de imóveis em Portugal', NULL, NULL, 'cat-fin', 'approved', 'u-demo', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('w-imovirtual', 'Imovirtual', 'https://www.imovirtual.com', 'Anúncios de casas e apartamentos', NULL, NULL, 'cat-fin', 'approved', 'u-joana', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('w-ryanair', 'Ryanair', 'https://www.ryanair.com', 'Voos low-cost', NULL, NULL, 'cat-viagens', 'approved', 'u-tiago', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('w-tap', 'TAP', 'https://www.flytap.com', 'Companhia aérea nacional', NULL, NULL, 'cat-viagens', 'approved', 'u-demo', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('w-notion', 'Notion', 'https://www.notion.so', 'Workspace para notas e organização', NULL, NULL, 'cat-produtividade', 'approved', 'u-demo', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('w-trello', 'Trello', 'https://trello.com', 'Kanban e gestão de tarefas', NULL, NULL, 'cat-produtividade', 'approved', 'u-joana', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Website votes (for rankings/comparisons)
INSERT OR IGNORE INTO website_votes (id, website_id, user_id, value, created_at)
VALUES
  ('wv1', 'w-idealista', 'u-demo', 1, CURRENT_TIMESTAMP),
  ('wv2', 'w-idealista', 'u-joana', 1, CURRENT_TIMESTAMP),
  ('wv3', 'w-imovirtual', 'u-tiago', 1, CURRENT_TIMESTAMP),
  ('wv4', 'w-imovirtual', 'u-demo', -1, CURRENT_TIMESTAMP),
  ('wv5', 'w-notion', 'u-joana', 1, CURRENT_TIMESTAMP),
  ('wv6', 'w-trello', 'u-tiago', 1, CURRENT_TIMESTAMP);

-- Website comments (diversos sítios)
INSERT OR IGNORE INTO comments (id, website_id, user_id, content, parent_id, status, kind, created_at, updated_at)
VALUES
  ('c1', 'w-idealista', 'u-joana', 'Muito útil para filtrar por zona.', NULL, 'visible', 'general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('c2', 'w-imovirtual', 'u-demo', 'Podia ter melhores alertas.', NULL, 'visible', 'suggestion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('c3', 'w-ryanair', 'u-tiago', 'Preços incríveis em promoções.', NULL, 'visible', 'general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('c4', 'w-notion', 'u-demo', 'Ótimo para organizar equipas.', NULL, 'visible', 'general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('c5', 'w-notion', 'u-joana', 'Concordo! Templates ajudam muito.', 'c4', 'visible', 'reply', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO comment_votes (id, comment_id, user_id, value, created_at)
VALUES
  ('cv1', 'c1', 'u-demo', 1, CURRENT_TIMESTAMP),
  ('cv2', 'c2', 'u-tiago', -1, CURRENT_TIMESTAMP),
  ('cv3', 'c4', 'u-joana', 1, CURRENT_TIMESTAMP);

-- Ideas
INSERT OR IGNORE INTO ideas (id, title, description, status, suggested_by, claimed_by, claimed_at, created_at)
VALUES
  ('idea1', 'Comparador de supermercados', 'Comparar preços por produto e localização', 'open', 'u-demo', NULL, NULL, CURRENT_TIMESTAMP),
  ('idea2', 'Agenda cultural local', 'Eventos por distrito com filtros por categoria', 'open', 'u-joana', NULL, NULL, CURRENT_TIMESTAMP),
  ('idea3', 'Mapa de coworks', 'Lista e ranking de espaços de cowork em PT', 'approved', 'u-tiago', 'u-demo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO idea_features (id, idea_id, description, created_by, created_at)
VALUES
  ('if1', 'idea1', 'Alertas de baixa de preço', 'u-demo', CURRENT_TIMESTAMP),
  ('if2', 'idea1', 'Comparação por marca branca', 'u-joana', CURRENT_TIMESTAMP),
  ('if3', 'idea2', 'Integração com calendário Google', 'u-tiago', CURRENT_TIMESTAMP),
  ('if4', 'idea2', 'Feed por concelho', 'u-demo', CURRENT_TIMESTAMP),
  ('if5', 'idea3', 'Filtros por preço/hora', 'u-joana', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO idea_votes (id, idea_id, user_id, value, created_at)
VALUES
  ('iv1', 'idea1', 'u-demo', 1, CURRENT_TIMESTAMP),
  ('iv2', 'idea1', 'u-joana', 1, CURRENT_TIMESTAMP),
  ('iv3', 'idea1', 'u-tiago', -1, CURRENT_TIMESTAMP),
  ('iv4', 'idea2', 'u-demo', 1, CURRENT_TIMESTAMP),
  ('iv5', 'idea3', 'u-joana', 1, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO idea_comments (id, idea_id, user_id, content, created_at)
VALUES
  ('ic1', 'idea1', 'u-tiago', 'Se tiver API pública era excelente.', CURRENT_TIMESTAMP),
  ('ic2', 'idea1', 'u-joana', 'Concordo, e com histórico de preços.', CURRENT_TIMESTAMP),
  ('ic3', 'idea2', 'u-demo', 'Importante ter filtro por família.', CURRENT_TIMESTAMP),
  ('ic4', 'idea3', 'u-joana', 'Já usei algo parecido, há procura.', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO idea_feature_votes (id, feature_id, user_id, value, created_at)
VALUES
  ('ifv1', 'if1', 'u-joana', 1, CURRENT_TIMESTAMP),
  ('ifv2', 'if1', 'u-tiago', 1, CURRENT_TIMESTAMP),
  ('ifv3', 'if2', 'u-demo', -1, CURRENT_TIMESTAMP),
  ('ifv4', 'if3', 'u-demo', 1, CURRENT_TIMESTAMP),
  ('ifv5', 'if5', 'u-tiago', 1, CURRENT_TIMESTAMP);

-- Daily comparisons + votes
INSERT OR IGNORE INTO daily_comparisons (id, date, category_id, website_a_id, website_b_id, created_at)
VALUES
  ('dc-today', DATE('now'), 'cat-fin', 'w-idealista', 'w-imovirtual', CURRENT_TIMESTAMP),
  ('dc-y1', DATE('now', '-1 day'), 'cat-viagens', 'w-ryanair', 'w-tap', CURRENT_TIMESTAMP),
  ('dc-y2', DATE('now', '-2 day'), 'cat-produtividade', 'w-notion', 'w-trello', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO comparison_votes (id, comparison_id, user_id, voted_for, created_at)
VALUES
  ('dvv1', 'dc-today', 'u-demo', 'w-idealista', CURRENT_TIMESTAMP),
  ('dvv2', 'dc-today', 'u-joana', 'w-imovirtual', CURRENT_TIMESTAMP),
  ('dvv3', 'dc-today', 'u-tiago', 'w-idealista', CURRENT_TIMESTAMP),
  ('dvv4', 'dc-y1', 'u-demo', 'w-ryanair', CURRENT_TIMESTAMP),
  ('dvv5', 'dc-y1', 'u-joana', 'w-ryanair', CURRENT_TIMESTAMP),
  ('dvv6', 'dc-y2', 'u-tiago', 'w-notion', CURRENT_TIMESTAMP);

-- Notifications
INSERT OR IGNORE INTO notifications (id, user_id, type, title, message, entity_type, entity_id, is_read, created_at)
VALUES
  ('n1', 'u-demo', 'website_status', 'Website aprovado', 'O teu website “Idealista” foi aprovado.', 'website', 'w-idealista', 0, CURRENT_TIMESTAMP),
  ('n2', 'u-joana', 'idea_update', 'Nova interação na tua ideia', 'A tua ideia “Agenda cultural local” recebeu um comentário.', 'idea', 'idea2', 0, CURRENT_TIMESTAMP),
  ('n3', 'u-tiago', 'comparison', 'Comparativo diário disponível', 'Já podes votar no comparativo de hoje.', 'comparison', 'dc-today', 1, CURRENT_TIMESTAMP),
  ('n4', 'u-demo', 'idea_claimed', 'Ideia reclamada', 'A ideia “Mapa de coworks” foi reclamada para implementação.', 'idea', 'idea3', 0, CURRENT_TIMESTAMP);
