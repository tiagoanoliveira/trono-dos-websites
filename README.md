# 👑 Trono dos Websites

Plataforma colaborativa que reúne as melhores ferramentas e websites para portugueses.

## 🚀 Tecnologias

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Cloudflare Workers
- **Base de Dados:** Cloudflare D1 (SQLite)
- **Autenticação:** Email/Password + Google OAuth
- **Deploy:** Cloudflare Pages

## 📦 Estrutura

```bash
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                      │
│                  (Frontend - React + Tailwind)           │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  Cloudflare Workers                      │
│                     (API Backend)                        │
└─────────────────────────┬───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Cloudflare   │ │  Cloudflare   │ │  Cloudflare   │
│      D1       │ │      R2       │ │      KV       │
│  (Database)   │ │   (Assets)    │ │   (Cache)     │
└───────────────┘ └───────────────┘ └───────────────┘
```
## Base de Dados

```sql
-- Utilizadores
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- NULL se login via Google
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user', -- user, moderator, admin
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
  status TEXT DEFAULT 'active', -- active, pending, rejected
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
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
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
  status TEXT DEFAULT 'visible', -- visible, hidden, deleted
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
  target_type TEXT NOT NULL, -- website, comment, user
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
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
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Funcionalidades por Fase
### Fase 1 — Fundação
- [x] Setup do projeto (Vite + React + TypeScript + Tailwind)
- [x] Configuração Cloudflare Pages + Workers + D1
- [x] Layout base (header, footer, navegação)
- [x] Página inicial com listagem de categorias
- [x] Página de categoria com listagem de websites
- [x] Página de detalhe do website
### Fase 2 — Autenticação
- [x] Registo com email/password
- [x] Login com email/password
- [x] Login com Google OAuth
- [x] Gestão de sessões (JWT + cookies) — migrado para cookies httpOnly
- [x] Página de perfil do utilizador
- [x] Recuperação de password
### Fase 3 — Interação Básica 
- [x] Sistema de avaliação (1-5 estrelas)
- [x] Comentários em websites
- [x] Respostas a comentários (threading)
- [x] Ordenação por avaliação/data/popularidade
### Fase 4 — Contribuições 
- [ ] Formulário para propor novo website
- [ ] Formulário para sugerir nova categoria
- [ ] Painel de "minhas contribuições"
- [ ] Notificações de estado (aprovado/rejeitado)
### Fase 5 — Comparativos Diários
- [ ] Geração automática de comparativos (Cron via Workers)
- [ ] Página do comparativo do dia
- [ ] Sistema de votação
- [ ] Histórico de comparativos passados
- [ ] Estatísticas de vitórias por website
### Fase 6 — Moderação
- [ ] Sistema de denúncias
- [ ] Painel de administração
- [ ] Aprovação/rejeição de websites
- [ ] Aprovação/rejeição de categorias
- [ ] Gestão de denúncias
- [ ] Gestão de utilizadores
### Fase 7 — Refinamentos
- [ ] Pesquisa global (websites + categorias)
- [ ] Filtros avançados
- [ ] SEO (meta tags, sitemap, structured data)
- [ ] Performance (lazy loading, caching)
- [ ] PWA básico

 ## Estrutura de pastas

 ```bash
 trono-dos-websites/
├── apps/
│   ├── web/                    # Frontend React
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/         # Componentes base (Button, Input, Card...)
│   │   │   │   ├── layout/     # Header, Footer, Sidebar
│   │   │   │   └── features/   # Componentes específicos
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── stores/         # Estado global (Zustand)
│   │   │   └── types/
│   │   ├── public/
│   │   └── index.html
│   │
│   └── api/                    # Cloudflare Workers
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── services/
│       │   └── utils/
│       └── wrangler.toml
│
├── packages/
│   └── shared/                 # Tipos e utilitários partilhados
│       └── src/
│           ├── types/
│           └── validators/
│
├── migrations/                 # Migrações D1
├── scripts/                    # Scripts de setup/seed
└── package.json
 ```
## Categorias iniciais sugeridas
| Categoria	|Subcategorias|
|--|--|
|Transportes|	Combustíveis, Portagens, Transportes Públicos, Viagens|
|Finanças|	Bancos, Investimentos, Impostos, Comparadores|
|Casa	|Imobiliário, Energia, Telecomunicações, Seguros|
|Tecnologia	|Produtividade, Desenvolvimento, IA, Hardware|
|Saúde|	SNS, Farmácias, Fitness, Nutrição|
|Educação	|Cursos, Línguas, Certificações, Recursos|
|Emprego	|Ofertas, Freelancing, CV, Networking|
|Lazer	|Streaming, Eventos, Restaurantes, Viagens|
|Serviços Públicos	|Governo, Finanças, Segurança Social, Justiça|
|Compras	|Comparadores, Promoções, Marketplaces, Cashback|

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar frontend
npm run dev

# Iniciar API (noutra janela)
npm run dev:api

# Correr migrações
npm run db:migrate
```

## 🚀 Deploy na Cloudflare

### API (Workers + D1)
1. Instalar dependências: `npm install`
2. Criar a base D1: `cd apps/api && wrangler d1 create trono-db` e atualizar o `database_id` em `apps/api/wrangler.toml` (o nome do worker nesse ficheiro é `trono-api`).
3. Aplicar migrações: `npm run db:migrate` (executa `wrangler d1 migrations apply trono-db`).
4. Segredos e variáveis:
   - `wrangler secret put JWT_SECRET`
   - Opcional: `wrangler secret put GOOGLE_CLIENT_ID` e `wrangler secret put GOOGLE_CLIENT_SECRET`
   - Ajustar `ENVIRONMENT` para `production` em `wrangler.toml` ou via `--var ENVIRONMENT=production`
5. Deploy do worker: `npm run deploy` (ou `wrangler deploy` dentro de `apps/api`).

### Frontend (Cloudflare Pages)
1. Criar projeto Pages a partir do repositório.
2. Instalação: `npm install`
3. Build command: `npm run build --workspace=apps/web`
4. Output directory: `apps/web/dist`
5. Node version: 18+
6. Rota / binding para API: em Pages > Functions/Routes, criar rota `/api/*` apontando para o worker `trono-api` (nome definido em `apps/api/wrangler.toml`). Assim o frontend continua a chamar `/api` como já configurado no Vite.

> Dica: em produção não deixar `JWT_SECRET` no `wrangler.toml`; usar apenas `wrangler secret`.
