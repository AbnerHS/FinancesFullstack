# Finances — Instruções para Agente de IA

Este arquivo serve como **guia operacional** para um agente de IA trabalhar neste repositório com consistência (arquitetura, convenções e comandos).

## Objetivo do Agente

- Implementar features e correções mantendo padrões do projeto (camadas, HATEOAS/HAL, MapStruct, Problem Details, Flyway).
- Preferir mudanças pequenas, com baixo risco e fáceis de revisar.
- **Nunca** expor valores de secrets (ex.: conteúdo do `.env`) em logs, respostas ou commits.

## Estrutura do Repositório

- `rest-api-finances/`: API REST em Java (Spring Boot) + Oracle via Docker.
- `frontend-finances/`: frontend web (React/Vite).

## Como Rodar Localmente (API + Oracle)

1. Subir stack do backend (Oracle + Spring):
   - `cd rest-api-finances`
   - `docker compose up -d`

### Docker Compose (serviços / portas)

Arquivo: `rest-api-finances/docker-compose.yml`

- `oracle-db`
  - Porta: `1521:1521`
- `spring-app`
  - Portas: `8080:8080` (HTTP) e `5005:5005` (debug)

### Comandos Úteis (backend)

- Logs do Spring: `docker compose logs -f spring-app`
- Logs do Oracle: `docker compose logs -f oracle-db`
- Ver variáveis dentro do container: `docker exec -it spring-app env`

## Backend (`rest-api-finances/`)

### Stack

- Java 21, Spring Boot 3+
- Spring Security + JWT (access/refresh)
- REST + HATEOAS (HAL)
- OpenAPI/Swagger (SpringDoc)
- Persistência: Spring Data JPA / Hibernate
- Migrações: Flyway
- Banco: Oracle (Docker)

### Pacotes (convenção)

Base: `com.abnerhs.rest_api_finances`

- `model`, `dto`, `mapper`, `repository`, `service`, `controllers`
- `assembler` (HATEOAS)
- `exception` (erros via `ProblemDetail`)
- `config`
- `projection`

### Padrões de DTO / Mapping / Erros

- DTOs por padrão em **`record`**.
- Mapeamento com **MapStruct** (`mapper`).
- Tratamento de erro com **Problem Details** (`ProblemDetail`).

### Migrações (Flyway)

- Caminho: `rest-api-finances/src/main/resources/db/migration`
- Regra: ao alterar schema/constraints, adicionar uma nova migration (`V<N>__descricao.sql`), sem editar migrations antigas já aplicadas.

### Variáveis de Ambiente (backend)

Fonte: `rest-api-finances/.env` (carregado no container do `spring-app`).

- Banco/Conexão:
  - `DB_HOST`, `DB_PORT`, `DB_SERVICE_NAME`
  - `DB_USERNAME`, `DB_PASSWORD`
  - `SPRING_DATASOURCE_URL`
- Flyway:
  - `FLYWAY_SCHEMAS`
  - `FLYWAY_REPAIR_ON_MIGRATE`
- Servidor:
  - `SERVER_PORT`
- JWT:
  - `JWT_ACCESS_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`
  - `JWT_ACCESS_TOKEN_EXPIRATION_MS`, `JWT_REFRESH_TOKEN_EXPIRATION_MS`

Observação: existem defaults via `application.yml` para:

- `APP_CORS_ALLOWED_ORIGINS` (default inclui `http://localhost:5173`, `http://localhost:3000`)
- `JWT_REFRESH_COOKIE_SECURE` (default `false`)
- `JWT_REFRESH_COOKIE_SAME_SITE` (default `Lax`)

### Auth (endpoints e cookie)

Base: `/api/auth`

- `POST /api/auth/register`: retorna `accessToken` e seta refresh token em cookie.
- `POST /api/auth/login`: retorna `accessToken` e seta refresh token em cookie.
- `POST /api/auth/refresh`: lê refresh token do cookie, retorna novo `accessToken` e reemite refresh token.

Cookie do refresh token:

- Nome: `refresh_token`
- Flags: `HttpOnly=true`, `Secure` configurável, `SameSite` configurável
- `Path=/api/auth`
- `Max-Age` baseado em `jwt.refresh.expiration-ms`

### Recursos do Domínio (alto nível)

- `User` tem `Plans`
- `Plan` tem `Periods`
- `Period` tem `Transactions` e `CreditCards`
- `CreditCard` tem `CreditCardInvoices`

Ao criar/alterar recursos:

- Expor via controllers + assemblers (HATEOAS) e manter respostas em HAL (`_embedded`, `_links`).
- Atualizar migrations se houver mudanças no banco.

### Rotas e Contratos HATEOAS (HAL)

Padrão de coleção:

- Sempre retornar `"_embedded": { "<recursoPlural>": [ ... ] }` e `"_links": { "self": { "href": "<url>" } }`.
- Em cada item: incluir `"_links"` com `self` e links de navegação (ex.: `periods`, `owner`, `plan`, `transactions`, `invoices`).
- Links podem ser **templated** quando aplicável (ex.: `invoice: { href: ".../{id}", templated: true }`).

Rotas (exemplos reais do projeto):

- Plans por usuário: `GET /api/users/{userId}/plans`
  - Item `plan._links`: `self`, `periods`, `owner`
- Periods por plan: `GET /api/plans/{planId}/periods`
  - Item `period._links`: `self`, `plan`, `transactions`, `invoices`
- Transactions por period: `GET /api/periods/{periodId}/transactions`
  - Item `transaction._links`: `self`, `invoice` (pode ser templated)

Campos observados nos payloads (útil para o agente manter consistência):

- `Transaction.dateTime` está no formato `dd/MM/yyyy`.
- `Transaction.amount` é serializado como string (ex.: `"1063.3"`), e `type` usa enum (ex.: `EXPENSE`, `REVENUE`).

## Frontend (`frontend-finances/`)

### Stack

- React 18 (Vite), Tailwind CSS, Lucide React
- Zustand (`persist`) para estado
- TanStack Query para data fetching
- React Router DOM v6 (Data APIs)
- Axios com interceptors (auto-refresh)

### Estrutura (convenção)

`src/`

- `api/` (axios, interceptors, instâncias)
- `components/` (UI reutilizável)
- `hooks/` (React Query, ex.: `useLogin`, `usePlans`)
- `layouts/`, `pages/`, `routes/`
- `services/` (lógica de rede “pura”)
- `store/` (Zustand, ex.: `useAuthStore`, `useUIStore`)
- `utils/` (helpers, formatadores, adaptadores HATEOAS)

### HATEOAS (link resolver)

Quando consumir `_links` do backend, usar um “resolver” que converta `href` absoluto em path relativo (removendo o prefixo `/api`) antes de chamar os services.

Exemplo (recomendado colocar em `frontend-finances/src/utils/hateoas.ts` ou equivalente):

```ts
export const resolveLink = (linkObj?: { href?: string } | null) => {
  if (!linkObj?.href) return null;
  const url = new URL(linkObj.href);
  return url.pathname.replace("/api", "");
};
```

## Checklist Rápido (antes de finalizar uma mudança)

- Backend:
  - Mudou schema? adicionar migration Flyway.
  - Criou/alterou DTO? manter como `record` e atualizar MapStruct.
  - Criou endpoint? manter HATEOAS/HAL + swagger annotations quando fizer sentido.
  - Erros? manter padrão `ProblemDetail`.
- Frontend:
  - Requisições via `services/` + hooks do React Query.
  - Refresh token só por cookie (`HttpOnly`) — não armazenar em `localStorage`.
