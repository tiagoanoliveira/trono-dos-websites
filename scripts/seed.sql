-- Seed data for Trono dos Websites
-- Run with: wrangler d1 execute trono-db --file=../../scripts/seed.sql

-- ============================================================
-- MAIN CATEGORIES
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('cat-transportes-0001', 'Transportes', 'transportes', 'Combustíveis, portagens, transportes públicos e viagens', '🚗', NULL, 'active'),
  ('cat-financas-000001', 'Finanças', 'financas', 'Bancos, investimentos, impostos e comparadores financeiros', '💰', NULL, 'active'),
  ('cat-casa-000000001', 'Casa', 'casa', 'Imobiliário, energia, telecomunicações e seguros', '🏠', NULL, 'active'),
  ('cat-tecnologia-0001', 'Tecnologia', 'tecnologia', 'Produtividade, desenvolvimento, IA e hardware', '💻', NULL, 'active'),
  ('cat-saude-000000001', 'Saúde', 'saude', 'SNS, farmácias, fitness e nutrição', '🏥', NULL, 'active'),
  ('cat-educacao-000001', 'Educação', 'educacao', 'Cursos, línguas, certificações e recursos educativos', '📚', NULL, 'active'),
  ('cat-emprego-000001', 'Emprego', 'emprego', 'Ofertas de emprego, freelancing, CV e networking', '💼', NULL, 'active'),
  ('cat-lazer-000000001', 'Lazer', 'lazer', 'Streaming, eventos, restaurantes e viagens de lazer', '🎉', NULL, 'active'),
  ('cat-servpub-000001', 'Serviços Públicos', 'servicos-publicos', 'Portais do governo, segurança social e serviços do estado', '🏛️', NULL, 'active'),
  ('cat-compras-000001', 'Compras', 'compras', 'Comparadores de preços, promoções, marketplaces e cashback', '🛒', NULL, 'active');

-- ============================================================
-- SUB-CATEGORIES: Transportes
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-combustiveis-01', 'Combustíveis', 'combustiveis', 'Preços e comparação de combustíveis', '⛽', 'cat-transportes-0001', 'active'),
  ('sub-portagens-000001', 'Portagens', 'portagens', 'Pagamento e gestão de portagens', '🛣️', 'cat-transportes-0001', 'active'),
  ('sub-transp-pub-0001', 'Transportes Públicos', 'transportes-publicos', 'Comboios, autocarros, metro e barcos', '🚌', 'cat-transportes-0001', 'active'),
  ('sub-viagens-000001', 'Viagens', 'viagens', 'Voos, hotéis e pacotes de viagem', '✈️', 'cat-transportes-0001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Finanças
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-bancos-000000001', 'Bancos', 'bancos', 'Banca online e serviços financeiros', '🏦', 'cat-financas-000001', 'active'),
  ('sub-investimentos-01', 'Investimentos', 'investimentos', 'Bolsa, fundos, criptomoedas e poupanças', '📈', 'cat-financas-000001', 'active'),
  ('sub-impostos-000001', 'Impostos', 'impostos', 'IRS, IVA e portais fiscais', '🧾', 'cat-financas-000001', 'active'),
  ('sub-comparadores-fin', 'Comparadores', 'comparadores-financeiros', 'Comparação de produtos financeiros', '🔍', 'cat-financas-000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Casa
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-imobiliario-0001', 'Imobiliário', 'imobiliario', 'Compra, venda e arrendamento de imóveis', '🏡', 'cat-casa-000000001', 'active'),
  ('sub-energia-000001', 'Energia', 'energia', 'Fornecedores de eletricidade e gás', '⚡', 'cat-casa-000000001', 'active'),
  ('sub-telecom-0000001', 'Telecomunicações', 'telecomunicacoes', 'Internet, TV e telemóvel', '📡', 'cat-casa-000000001', 'active'),
  ('sub-seguros-000001', 'Seguros', 'seguros', 'Seguros de casa, auto e vida', '🛡️', 'cat-casa-000000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Tecnologia
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-produtividade-01', 'Produtividade', 'produtividade', 'Ferramentas para produtividade e organização', '✅', 'cat-tecnologia-0001', 'active'),
  ('sub-desenvolvimento-1', 'Desenvolvimento', 'desenvolvimento', 'Ferramentas e recursos para programadores', '⚙️', 'cat-tecnologia-0001', 'active'),
  ('sub-ia-00000000001', 'IA', 'inteligencia-artificial', 'Inteligência artificial e machine learning', '🤖', 'cat-tecnologia-0001', 'active'),
  ('sub-hardware-000001', 'Hardware', 'hardware', 'Componentes e dispositivos tecnológicos', '🖥️', 'cat-tecnologia-0001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Saúde
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-sns-0000000001', 'SNS', 'sns', 'Serviço Nacional de Saúde e portais associados', '🏥', 'cat-saude-000000001', 'active'),
  ('sub-farmacias-000001', 'Farmácias', 'farmacias', 'Farmácias online e prescrições', '💊', 'cat-saude-000000001', 'active'),
  ('sub-fitness-000001', 'Fitness', 'fitness', 'Ginásios, desporto e exercício físico', '🏋️', 'cat-saude-000000001', 'active'),
  ('sub-nutricao-000001', 'Nutrição', 'nutricao', 'Dietas, receitas e alimentação saudável', '🥗', 'cat-saude-000000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Educação
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-cursos-0000001', 'Cursos', 'cursos', 'Plataformas de cursos online', '🎓', 'cat-educacao-000001', 'active'),
  ('sub-linguas-0000001', 'Línguas', 'linguas', 'Aprendizagem de línguas estrangeiras', '🌍', 'cat-educacao-000001', 'active'),
  ('sub-certificacoes-01', 'Certificações', 'certificacoes', 'Certificações profissionais e académicas', '📜', 'cat-educacao-000001', 'active'),
  ('sub-recursos-edu-001', 'Recursos', 'recursos-educativos', 'Recursos educativos gratuitos', '📖', 'cat-educacao-000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Emprego
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-ofertas-0000001', 'Ofertas de Emprego', 'ofertas-emprego', 'Portais de emprego e recrutamento', '📋', 'cat-emprego-000001', 'active'),
  ('sub-freelancing-0001', 'Freelancing', 'freelancing', 'Plataformas de trabalho freelance', '🧑‍💻', 'cat-emprego-000001', 'active'),
  ('sub-cv-00000000001', 'CV', 'cv', 'Ferramentas para criar e gerir currículos', '📄', 'cat-emprego-000001', 'active'),
  ('sub-networking-0001', 'Networking', 'networking', 'Redes profissionais e networking', '🤝', 'cat-emprego-000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Lazer
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-streaming-000001', 'Streaming', 'streaming', 'Plataformas de vídeo e música', '🎬', 'cat-lazer-000000001', 'active'),
  ('sub-eventos-0000001', 'Eventos', 'eventos', 'Bilhetes e informação sobre eventos', '🎟️', 'cat-lazer-000000001', 'active'),
  ('sub-restaurantes-001', 'Restaurantes', 'restaurantes', 'Reservas e descoberta de restaurantes', '🍽️', 'cat-lazer-000000001', 'active'),
  ('sub-viagens-laz-0001', 'Viagens', 'viagens-lazer', 'Inspiração e planeamento de viagens', '🌴', 'cat-lazer-000000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Serviços Públicos
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-governo-000001', 'Governo', 'governo', 'Portais e serviços do governo português', '🏛️', 'cat-servpub-000001', 'active'),
  ('sub-seg-social-0001', 'Segurança Social', 'seguranca-social', 'Portal da Segurança Social e prestações', '👥', 'cat-servpub-000001', 'active'),
  ('sub-justica-000001', 'Justiça', 'justica', 'Serviços de justiça e registos', '⚖️', 'cat-servpub-000001', 'active'),
  ('sub-financas-pub-01', 'Finanças Públicas', 'financas-publicas', 'Autoridade Tributária e declarações fiscais', '🏦', 'cat-servpub-000001', 'active');

-- ============================================================
-- SUB-CATEGORIES: Compras
-- ============================================================
INSERT INTO categories (id, name, slug, description, icon, parent_id, status) VALUES
  ('sub-comp-preco-0001', 'Comparadores de Preço', 'comparadores-preco', 'Comparação de preços de produtos', '🔎', 'cat-compras-000001', 'active'),
  ('sub-promocoes-000001', 'Promoções', 'promocoes', 'Descontos, vouchers e promoções', '🏷️', 'cat-compras-000001', 'active'),
  ('sub-marketplace-0001', 'Marketplaces', 'marketplaces', 'Plataformas de compra e venda online', '🛍️', 'cat-compras-000001', 'active'),
  ('sub-cashback-000001', 'Cashback', 'cashback', 'Plataformas de cashback e recompensas', '💸', 'cat-compras-000001', 'active');

-- ============================================================
-- WEBSITES
-- ============================================================
INSERT INTO websites (id, name, url, description, category_id, status, featured) VALUES
  -- Transportes: Portagens
  ('web-etoll-000000001', 'E-toll', 'https://www.e-toll.pt', 'Portal oficial para pagamento e gestão de portagens em Portugal', 'sub-portagens-000001', 'approved', TRUE),
  ('web-viaverde-000001', 'Via Verde', 'https://www.viaverde.pt', 'Serviço de portagens eletrónicas e mobilidade sem paragens', 'sub-portagens-000001', 'approved', FALSE),

  -- Transportes: Combustíveis
  ('web-gasolinapp-00001', 'Gasolinapp', 'https://www.gasolinapp.pt', 'Comparador de preços de combustíveis em tempo real em Portugal', 'sub-combustiveis-01', 'approved', TRUE),
  ('web-precombust-00001', 'Preço dos Combustíveis', 'https://precoscombustiveis.dgeg.gov.pt', 'Portal oficial da DGEG com os preços dos combustíveis em Portugal', 'sub-combustiveis-01', 'approved', FALSE),

  -- Transportes: Transportes Públicos
  ('web-cp-0000000001', 'CP — Comboios de Portugal', 'https://www.cp.pt', 'Portal oficial dos Comboios de Portugal para horários e bilhetes', 'sub-transp-pub-0001', 'approved', TRUE),
  ('web-redeexpressos-001', 'Rede Expressos', 'https://www.rede-expressos.pt', 'Compra de bilhetes de autocarro para todo o Portugal', 'sub-transp-pub-0001', 'approved', FALSE),
  ('web-metro-lisboa-001', 'Metro de Lisboa', 'https://www.metrolisboa.pt', 'Informação e serviços do Metropolitano de Lisboa', 'sub-transp-pub-0001', 'approved', FALSE),

  -- Transportes: Viagens
  ('web-flytap-000001', 'TAP Air Portugal', 'https://www.flytap.com', 'Companhia aérea nacional portuguesa — voos e viagens', 'sub-viagens-000001', 'approved', TRUE),
  ('web-ryanair-pt-0001', 'Ryanair', 'https://www.ryanair.com/pt/pt', 'Companhia aérea low-cost com rotas a partir de Portugal', 'sub-viagens-000001', 'approved', FALSE),

  -- Finanças: Impostos
  ('web-portalfinancas-01', 'Portal das Finanças', 'https://www.portaldasfinancas.gov.pt', 'Portal da Autoridade Tributária para declarações de IRS e serviços fiscais', 'sub-impostos-000001', 'approved', TRUE),
  ('web-efatura-0000001', 'E-Fatura', 'https://faturas.portaldasfinancas.gov.pt', 'Consulta e validação de faturas para o IRS', 'sub-impostos-000001', 'approved', FALSE),

  -- Finanças: Bancos
  ('web-cgd-000000001', 'Caixa Geral de Depósitos', 'https://www.cgd.pt', 'Banco público português — banca online e particulares', 'sub-bancos-000000001', 'approved', TRUE),
  ('web-millenniumbcp-001', 'Millennium BCP', 'https://www.millenniumbcp.pt', 'Banco privado português — serviços bancários online', 'sub-bancos-000000001', 'approved', FALSE),
  ('web-novobanco-000001', 'Novo Banco', 'https://www.novobanco.pt', 'Serviços bancários online do Novo Banco', 'sub-bancos-000000001', 'approved', FALSE),

  -- Finanças: Investimentos
  ('web-degiro-pt-0001', 'DEGIRO', 'https://www.degiro.pt', 'Plataforma de investimento em ações e ETFs com baixas comissões', 'sub-investimentos-01', 'approved', TRUE),
  ('web-wise-pt-000001', 'Wise', 'https://wise.com/pt', 'Transferências internacionais e conta multi-moeda', 'sub-investimentos-01', 'approved', FALSE),

  -- Finanças: Comparadores
  ('web-comparaja-000001', 'Comparaja', 'https://www.comparaja.pt', 'Comparador de produtos financeiros, seguros e telecomunicações', 'sub-comparadores-fin', 'approved', TRUE),

  -- Casa: Imobiliário
  ('web-imovirtual-000001', 'Imovirtual', 'https://www.imovirtual.com', 'Portal imobiliário líder em Portugal para compra, venda e arrendamento', 'sub-imobiliario-0001', 'approved', TRUE),
  ('web-idealista-pt-0001', 'Idealista', 'https://www.idealista.pt', 'Portal imobiliário com anúncios de compra, venda e arrendamento', 'sub-imobiliario-0001', 'approved', FALSE),
  ('web-olx-imoveis-0001', 'OLX Imóveis', 'https://www.olx.pt/imoveis', 'Anúncios de imóveis particulares no OLX Portugal', 'sub-imobiliario-0001', 'approved', FALSE),

  -- Casa: Energia
  ('web-edp-pt-000001', 'EDP', 'https://www.edp.pt', 'Fornecedor de energia elétrica e gás em Portugal', 'sub-energia-000001', 'approved', TRUE),
  ('web-galp-pt-000001', 'Galp', 'https://energia.galp.com/pt/particular', 'Fornecedor de energia e combustíveis em Portugal', 'sub-energia-000001', 'approved', FALSE),

  -- Casa: Telecomunicações
  ('web-vodafone-pt-001', 'Vodafone Portugal', 'https://www.vodafone.pt', 'Operador de telecomunicações — internet, TV e telemóvel', 'sub-telecom-0000001', 'approved', TRUE),
  ('web-nos-pt-0000001', 'NOS', 'https://www.nos.pt', 'Operador de telecomunicações — internet, TV e móvel', 'sub-telecom-0000001', 'approved', FALSE),
  ('web-meo-pt-0000001', 'MEO', 'https://www.meo.pt', 'Operador de telecomunicações da Altice Portugal', 'sub-telecom-0000001', 'approved', FALSE),

  -- Tecnologia: Desenvolvimento
  ('web-github-000001', 'GitHub', 'https://www.github.com', 'Plataforma de alojamento de código e controlo de versões Git', 'sub-desenvolvimento-1', 'approved', TRUE),
  ('web-codepen-000001', 'CodePen', 'https://codepen.io', 'Ambiente de desenvolvimento online para HTML, CSS e JavaScript', 'sub-desenvolvimento-1', 'approved', FALSE),
  ('web-sapo-pt-000001', 'SAPO', 'https://www.sapo.pt', 'Portal de internet português com notícias, email e serviços', 'sub-ia-00000000001', 'approved', FALSE),

  -- Tecnologia: IA
  ('web-chatgpt-000001', 'ChatGPT', 'https://chatgpt.com', 'Assistente de inteligência artificial da OpenAI', 'sub-ia-00000000001', 'approved', TRUE),

  -- Saúde: SNS
  ('web-sns-gov-pt-0001', 'Portal SNS', 'https://www.sns.gov.pt', 'Portal do Serviço Nacional de Saúde português', 'sub-sns-0000000001', 'approved', TRUE),
  ('web-sns24-pt-000001', 'SNS 24', 'https://www.sns24.gov.pt', 'Linha de saúde pública e triagem online do SNS', 'sub-sns-0000000001', 'approved', FALSE),

  -- Saúde: Farmácias
  ('web-farmacias-pt-001', 'Farmácias Portuguesas', 'https://www.farmaciasportuguesas.pt', 'Rede de farmácias e serviços farmacêuticos online', 'sub-farmacias-000001', 'approved', FALSE),

  -- Serviços Públicos: Governo
  ('web-eportugal-000001', 'ePortugal', 'https://eportugal.gov.pt', 'Portal único de serviços públicos do Estado português', 'sub-governo-000001', 'approved', TRUE),
  ('web-irn-mj-pt-0001', 'IRN — Registos e Notariado', 'https://www.irn.mj.pt', 'Instituto dos Registos e do Notariado — cartão de cidadão e passaporte', 'sub-justica-000001', 'approved', TRUE),

  -- Serviços Públicos: Segurança Social
  ('web-seg-social-0001', 'Segurança Social Direta', 'https://www.seg-social.pt', 'Portal da Segurança Social para gestão de prestações e contribuições', 'sub-seg-social-0001', 'approved', TRUE),

  -- Compras: Marketplaces
  ('web-olx-pt-000001', 'OLX Portugal', 'https://www.olx.pt', 'Marketplace de classificados para compra e venda de produtos usados', 'sub-marketplace-0001', 'approved', TRUE),
  ('web-amazon-pt-0001', 'Amazon Portugal', 'https://www.amazon.es', 'Maior marketplace online do mundo com entregas em Portugal', 'sub-marketplace-0001', 'approved', FALSE),
  ('web-kuantokusta-0001', 'KuantoKusta', 'https://www.kuantokusta.pt', 'Comparador de preços de produtos tecnológicos e eletrodomésticos', 'sub-comp-preco-0001', 'approved', TRUE);
