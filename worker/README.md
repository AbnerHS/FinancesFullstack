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

## API

Mesmo contrato do backend Java (HAL com `_links`/`_embedded`, erros em ProblemDetail), exceto:

| Antes (Java) | Agora |
|---|---|
| `/periods/*` | removido |
| `GET /periods/{id}/transactions` | `GET /plans/{id}/transactions?month=AAAA-MM` ou `?from=&to=` (AAAA-MM-DD) |
| `GET /periods/{id}/invoices` | `GET /plans/{id}/invoices?month=AAAA-MM` (ou `from`/`to` em AAAA-MM; sem filtro, todas) |
| `GET /periods/{id}/summary` | `GET /plans/{id}/summary` (filtro opcional) |
| `GET /reports/spending-by-category?periodId=` | `?planId=` + filtro opcional |
| lista de períodos | `GET /plans/{id}/months`: meses com transações e totais |
| `PATCH` de `order` em cada transação | também `PUT /plans/{id}/transactions/order` `{ month, transactionIds }` |
| transação: `periodId`, `dateTime` (`dd/MM/yyyy`), `amount` texto | `planId`, `referenceDate`, `createdAt` (ISO), `amount` número |
| recorrência: `numberOfPeriods` | `occurrences` (2 a 120) |
| fatura: `periodId` | `planId` + `referenceMonth` (AAAA-MM) |
| `GET /users` (todos os usuários) | removido; `/users/{id}` só para quem divide plano |
| — | `POST /auth/logout` |

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

## Migração dos dados do MySQL

`scripts/migrate-from-mysql.ts` lê o MySQL do backend Java e gera o SQL para o D1, já no modelo
sem períodos. Ele **não grava nada** se encontrar dados que exigem decisão (lista os registros e
sai com código 1): e-mails que colidem após normalizar, faturas duplicadas do mesmo cartão no mesmo
mês e plano, transações sem período, fatura de outro plano, comprovante com extensão não suportada.

Conversões:

- UUID `binary(16)` → texto; valores → centavos (`ROUND` exato do MySQL); datas → ISO-8601 (UTC).
- E-mails em minúsculas e sem espaços nas pontas.
- `reference_date`: o vencimento se cair no mês do período, senão a data de criação se cair no mês,
  senão o dia 1º. Transação ligada a fatura de outro mês vai para o mês da fatura (fim da ordem).
- Fatura: `plan_id` e `reference_month` vêm do período.
- Tipo do comprovante recalculado pela extensão (o Java guardava o Content-Type do navegador).
- Perdem-se: `monthly_balance` (avisado se diferente de zero) e períodos vazios.

Passo a passo (produção):

```bash
# 1. Pare as escritas no backend Java (ex.: docker compose stop spring-app na VPS).
# 2. Túnel até o MySQL e cópia dos comprovantes:
ssh -N -L 3307:127.0.0.1:3306 usuario@vps &
rsync -a usuario@vps:<VPS_DEPLOY_PATH>/payment-documents/ ./payment-documents/

# 3. Export (valida e gera migration/):
MYSQL_URL=mysql://finances_user:SENHA@127.0.0.1:3307/finances \
  pnpm migrate:mysql export --out migration --documents-dir ./payment-documents

# 4. Import no D1 remoto (depois do "Primeiro deploy" acima) e upload dos arquivos para o R2:
pnpm db:migrate:remote
npx wrangler d1 execute finances --remote --file migration/d1-import.sql
./migration/upload-documents.sh ./payment-documents --remote

# 5. Conferência (contagens por tabela, totais por plano, nº de comprovantes):
pnpm migrate:mysql verify --dir migration --remote
```

Use os **mesmos** `JWT_ACCESS_TOKEN_SECRET`/`JWT_REFRESH_TOKEN_SECRET` do Java: as sessões abertas
continuam válidas. Senhas BCrypt são aceitas e regravadas em PBKDF2 no primeiro login.
Para refazer, apague e recrie o banco D1 (ou use o Time Travel) e repita os passos 3 a 5; o MySQL
não é alterado pelo script.
