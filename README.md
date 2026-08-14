# FinTrack SaaS

Sistema completo de controle financeiro pessoal e compartilhado com chatbot de IA e modo casal.

## Funcionalidades
- Dashboard com KPIs e gráficos
- Controle de transações com exportação CSV
- Carteira de investimentos e simulador de juros compostos
- Orçamentos com alertas visuais
- Metas financeiras com estimativa de tempo
- Relatórios comparativos e mapa de calor
- Modo Casal/Família (carteiras compartilhadas)
- Chatbot de IA para dicas financeiras

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

3. **Variáveis de Ambiente**
   | Variável | Descrição |
   |----------|-----------|
   | `DATABASE_URL` | URL do PostgreSQL (Neon, Supabase, Railway) |
   | `NEXTAUTH_SECRET` | Chave secreta para autenticação |
   | `OPENAI_API_KEY` | Opcional — chatbot funciona sem ela |

4. **Deploy!** A Vercel roda `prisma generate` automaticamente via `postinstall`.

## Rodar Localmente

```bash
npm install
cp .env.example .env
# Edite .env com sua DATABASE_URL
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000` — a landing page tem o botão "Ver Demo".

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
