# 👑 Trono dos Websites

Plataforma colaborativa que reúne as melhores ferramentas e websites para portugueses.

## 🚀 Tecnologias

- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Cloudflare Workers
- **Base de Dados:** Cloudflare D1 (SQLite)
- **Autenticação:** Email/Password + Google OAuth
- **Deploy:** Cloudflare Pages

## 📦 Estrutura

├── apps/
│ ├── web/ # Frontend React
│ └── api/ # Cloudflare Workers API
├── packages/
│ └── shared/ # Tipos e utilitários partilhados
└── migrations/ # Migrações da base de dados

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
