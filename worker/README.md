# finances-worker

Backend do FinancesFullstack em Cloudflare Workers (Hono + D1 + R2), substituindo `rest-api-finances/`.
O mesmo Worker serve o build do frontend (`../frontend/dist`) e a API em `/api/*`.

## Stack

- **Hono**: rotas e middlewares
- **Drizzle ORM + D1**: banco SQLite gerenciado (`src/db/schema.ts`, migrations em `migrations/`)
- **R2**: comprovantes das transações (binding `DOCS`)
- **jose**: JWT compatível com o `JwtService` do Java (HS256, `sub` = e-mail, claim `token_type`)
- **Zod**: validação das requisições
- **Vitest + @cloudflare/vitest-pool-workers**: testes rodando no runtime do Workers

## Modelo de dados

Diferenças em relação ao schema MySQL:

- Não existe `financial_periods`. O mês de uma transação vem de `transactions.reference_date`
  (data de competência) e o de uma fatura vem de `credit_card_invoices.reference_month` (`YYYY-MM`).
- `transactions` e `credit_card_invoices` apontam direto para o plano (`plan_id`).
- Transação vinculada a uma fatura tem `reference_date` dentro do mês da fatura.
- Valores monetários em centavos (`amount_cents`); a API continua expondo decimais.
- IDs são UUID em texto; datas em ISO-8601.

## Desenvolvimento

```bash
pnpm install
cp .dev.vars.example .dev.vars    # preencher segredos (openssl rand -base64 32)
pnpm db:migrate:local
pnpm dev                          # http://localhost:8787
pnpm test
pnpm typecheck
```

Depois de alterar `src/db/schema.ts`: `pnpm db:generate` (gera um novo SQL em `migrations/`).
Depois de alterar `wrangler.jsonc`: `pnpm cf-typegen`.

## Primeiro deploy

```bash
npx wrangler d1 create finances --location enam   # copiar o database_id para wrangler.jsonc
npx wrangler r2 bucket create finances-docs
npx wrangler secret put JWT_ACCESS_TOKEN_SECRET
npx wrangler secret put JWT_REFRESH_TOKEN_SECRET
npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
pnpm db:migrate:remote
(cd ../frontend && pnpm build) && pnpm deploy
```
