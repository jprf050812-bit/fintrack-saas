# FinTrack SaaS

Sistema completo de controle financeiro pessoal e compartilhado com chatbot de IA e modo casal.

## Funcionalidades
- Cadastro e login de usuários (NextAuth + senha com hash bcrypt)
- Dashboard com KPIs e gráficos calculados a partir de dados reais
- Controle de transações (criar/excluir) com exportação CSV
- Carteira de investimentos e simulador de juros compostos
- Orçamentos vinculados a categorias, com alertas visuais
- Metas financeiras com acompanhamento de progresso
- Relatórios comparativos e mapa de calor de gastos
- Modo Casal (envio, aceite e recusa de convites, com criação automática da parceria) — carteiras compartilhadas ainda não implementadas
- Chatbot com respostas baseadas em regras (funciona sem chave de IA)

Todas as páginas acima leem e gravam no Postgres via Prisma — não há mais dados mockados.

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- OpenAI API (Chatbot — opcional, funciona em modo fallback)

## Deploy na Vercel

1. **Push para o GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seuusuario/fintrack-saas.git
   git push -u origin main
   ```

2. **Importe na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Importe o repositório
   - Framework preset: **Next.js**

3. **Variáveis de Ambiente** (Project Settings → Environment Variables na Vercel)
   | Variável | Descrição |
   |----------|-----------|
   | `DATABASE_URL` | URL do PostgreSQL — use a connection string **pooled** se seu provedor oferecer uma (Neon, Supabase e Vercel Postgres todas oferecem) |
   | `NEXTAUTH_SECRET` | Chave secreta para autenticação. Gere com `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | URL pública do seu deploy, ex: `https://seu-app.vercel.app` |
   | `OPENAI_API_KEY` | Opcional — chatbot funciona sem ela (modo baseado em regras) |

4. **Crie as tabelas no banco** (rode uma vez, localmente, apontando para o banco de produção):
   ```bash
   DATABASE_URL="sua-url-de-producao" npx prisma migrate deploy
   ```

5. **Deploy!** A Vercel roda `prisma generate` automaticamente via `postinstall`.

## Rodar Localmente

```bash
npm install
cp .env.example .env
# Edite .env com sua DATABASE_URL, NEXTAUTH_SECRET e NEXTAUTH_URL
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Isso cria um usuário de demonstração: **demo@fintrack.com / demo123456** (personalizável via `SEED_DEMO_EMAIL` e `SEED_DEMO_PASSWORD`).

Acesse `http://localhost:3000` — a landing page tem os botões "Entrar" e "Criar Conta". Crie uma conta ou use o login demo acima para acessar o dashboard.

## Estrutura do Projeto
```
app/
  api/          # API Routes (chat, dashboard, transactions, etc.)
  dashboard/    # Dashboard principal
  transactions/ # Tabela de transações
  investments/  # Carteira + simulador
  budgets/      # Orçamentos
  goals/        # Metas financeiras
  reports/      # Relatórios e insights
  couple/       # Modo casal/família
  settings/     # Configurações
  page.tsx      # Landing page
components/
  ui/           # Componentes base (Button, Card, Badge, etc.)
  sidebar.tsx   # Navegação lateral
  mobile-nav.tsx # Navegação mobile
  chatbot.tsx   # Chatbot flutuante
  kpi-card.tsx  # Cards de métricas
  transaction-list.tsx # Lista de transações
prisma/
  schema.prisma # Schema com 20 models
  seed.ts       # Dados iniciais
```
