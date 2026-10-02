# Sistema de gestao financeira pessoal e compartilhada

Projeto de pratica e estudo para controle financeiro pessoal e compartilhado: planos financeiros com parceiros, transacoes por mes, cartoes, faturas e comprovantes de pagamento.

Producao: **https://finances.abnerh.workers.dev**

## Visao geral

Frontend e API rodam juntos em um unico **Cloudflare Worker**: o build do React e servido como assets estaticos e a API responde em `/api` na mesma origem.

- `worker`: API (Hono) com banco D1, arquivos no R2, scripts de migracao e configuracao do Worker. Detalhes em [`worker/README.md`](worker/README.md).
- `frontend`: interface web em React.
- `rest-api-finances`: backend Java/Spring Boot original, **legado** — mantido apenas como referencia; nao e mais publicado.

O modelo de dados nao tem mais "periodos": o mes de uma transacao vem da data de competencia (`reference_date`) e o de uma fatura do mes de referencia (`reference_month`).

## Stack

### Worker (API)

- Cloudflare Workers
- Hono
- Drizzle ORM + D1 (SQLite)
- R2 (comprovantes)
- Zod
- jose (JWT, compativel com os tokens do backend legado)
- Vitest + `@cloudflare/vitest-pool-workers`

### Frontend

- React 19
- TypeScript 5
- Vite 7
- TanStack Router e TanStack Query
- shadcn/ui e Tailwind CSS 4
- Zustand
- Axios
- React Hook Form

## Estrutura do repositorio

```text
FinancesFullstack/
|-- worker/              API + configuracao do Worker (wrangler.jsonc)
|-- frontend/            React (build servido pelo Worker)
|-- rest-api-finances/   backend Java legado
|-- .github/workflows/   CI e deploy
```

## Como iniciar

### Pre-requisitos

- Node.js 22+
- pnpm

### 1. API + frontend juntos (como em producao)

```bash
cd worker
pnpm install
cp .dev.vars.example .dev.vars        # preencher os segredos locais
pnpm db:migrate:local
(cd ../frontend && pnpm install && VITE_API_BASE_URL=/api VITE_GOOGLE_CLIENT_ID=... VITE_GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback pnpm build)
pnpm dev                              # http://localhost:8787
```

### 2. Frontend com hot reload

Com o `pnpm dev` do Worker rodando, em outro terminal:

```bash
cd frontend
pnpm dev                              # http://localhost:5173, proxy de /api para :8787
```

O `frontend/.env.development` ja aponta o proxy (`VITE_API_PROXY_TARGET`) para o Worker local.

## Testes e checks

```bash
cd worker && pnpm test && pnpm typecheck
cd frontend && pnpm lint && pnpm typecheck && pnpm build
```

## CI/CD

- `ci-worker.yml`: typecheck, testes e `wrangler deploy --dry-run` em PRs e pushes que mexem em `worker/`.
- `ci-frontend.yml`: lint, typecheck e build do frontend.
- `release-please.yml`: versiona o pacote `worker/` a partir de Conventional Commits e abre a Release PR.
- `deploy-worker.yml`: a cada GitHub Release (ou manualmente), faz o build do frontend, roda os testes, aplica as migrations do D1 e publica o Worker.

Configuracao do deploy (secrets, variaveis do environment `Production`, recursos na Cloudflare) e migracao de dados do MySQL legado: ver [`worker/README.md`](worker/README.md).

Convencoes de commit:

- `fix:` gera bump de patch
- `feat:` gera bump de minor
- `feat!:` ou `BREAKING CHANGE:` gera bump de major

## Backend legado

O codigo em `rest-api-finances/` (Spring Boot + MySQL, antes publicado em uma VPS Oracle) continua no repositorio apenas como referencia. Ele nao tem mais workflow de deploy; o `ci-backend.yml` segue validando o codigo enquanto ele existir.
