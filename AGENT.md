# Finances - Instrucoes para Agente de IA

Este arquivo serve como guia operacional para um agente de IA trabalhar neste repositorio com consistencia, respeitando arquitetura, convencoes e comandos do projeto.

## Objetivo do Agente

- Implementar features e correcoes mantendo os padroes do projeto.
- Preferir mudancas pequenas, de baixo risco e faceis de revisar.
- Nunca expor secrets em logs, respostas ou commits.

## Estrutura do Repositorio

- `rest-api-finances/`: API REST em Java/Spring Boot com Oracle via Docker.
- `frontend/`: frontend web atual em React, TypeScript e Vite.

## Como Rodar Localmente (API + Oracle)

1. Subir a stack do backend:
   - `cd rest-api-finances`
   - `docker compose up -d`

### Docker Compose (servicos / portas)

Arquivo: `rest-api-finances/docker-compose.yml`

- `oracle-db`
  - Porta: `1521:1521`
- `spring-app`
  - Portas: `8080:8080` (HTTP) e `5005:5005` (debug)

### Comandos Uteis (backend)

- Logs do Spring: `docker compose logs -f spring-app`
- Logs do Oracle: `docker compose logs -f oracle-db`
- Ver variaveis dentro do container: `docker exec -it spring-app env`

## Backend (`rest-api-finances/`)

### Stack

- Java 21
- Spring Boot 3+
- Spring Security + JWT (access/refresh)
- REST + HATEOAS (HAL)
- OpenAPI/Swagger (SpringDoc)
- Spring Data JPA / Hibernate
- Flyway
- Oracle Database

### Pacotes (convencao)

Base: `com.abnerhs.rest_api_finances`

- `model`, `dto`, `mapper`, `repository`, `service`, `controllers`
- `assembler`
- `exception`
- `config`
- `projection`

### Padroes de DTO / Mapping / Erros

- DTOs por padrao em `record`.
- Mapeamento com MapStruct.
- Tratamento de erro com `ProblemDetail`.

### Migracoes (Flyway)

- Caminho: `rest-api-finances/src/main/resources/db/migration`
- Ao alterar schema ou constraints, adicionar uma nova migration `V<N>__descricao.sql`.
- Nao editar migrations antigas ja aplicadas.

### Variaveis de Ambiente (backend)

Fonte: `rest-api-finances/.env` (carregado no container do `spring-app`).

- Banco/conexao:
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

Defaults relevantes no `application.yml`:

- `APP_CORS_ALLOWED_ORIGINS` inclui ambientes locais do frontend.
- `JWT_REFRESH_COOKIE_SECURE` default `false`.
- `JWT_REFRESH_COOKIE_SAME_SITE` default `Lax`.

### Auth (endpoints e cookie)

Base: `/api/auth`

- `POST /api/auth/register`: retorna `accessToken` e seta refresh token em cookie.
- `POST /api/auth/login`: retorna `accessToken` e seta refresh token em cookie.
- `POST /api/auth/refresh`: le refresh token do cookie, retorna novo `accessToken` e reemite refresh token.

Cookie do refresh token:

- Nome: `refresh_token`
- Flags: `HttpOnly=true`, `Secure` configuravel, `SameSite` configuravel
- `Path=/api/auth`
- `Max-Age` baseado em `jwt.refresh.expiration-ms`

### Recursos do Dominio

- `User` tem `Plans`
- `Plan` tem `Periods`
- `Period` tem `Transactions` e `CreditCards`
- `CreditCard` tem `CreditCardInvoices`

Ao criar ou alterar recursos:

- Expor via controllers + assemblers e manter respostas em HAL.
- Atualizar migrations se houver mudancas no banco.

### Rotas e Contratos HATEOAS (HAL)

Padrao de colecao:

- Retornar `_embedded` com o recurso plural e `_links.self`.
- Cada item deve incluir `_links` com `self` e links de navegacao relacionados.
- Links podem ser templated quando fizer sentido.

Exemplos:

- `GET /api/users/{userId}/plans`
- `GET /api/plans/{planId}/periods`
- `GET /api/periods/{periodId}/transactions`

Campos observados nos payloads:

- `Transaction.dateTime` no formato `dd/MM/yyyy`.
- `Transaction.amount` serializado como string.
- `type` usa enum como `EXPENSE` e `REVENUE`.

## Frontend (`frontend/`)

### Stack

- React 19 + Vite 7
- TypeScript 5
- TanStack Router
- TanStack Query
- shadcn/ui
- Tailwind CSS 4
- Zustand
- Axios
- React Hook Form

### Estrutura (convencao)

`frontend/src/`

- `components/`: componentes reutilizaveis e UI base
- `features/`: modulos por dominio/feature
- `layouts/`: layouts compartilhados
- `lib/`: utilitarios, clientes HTTP, helpers e integracoes
- `pages/`: composicoes de tela
- `routes/`: definicao de rotas TanStack Router
- `stores/`: estado global
- `router.tsx`: configuracao central do router
- `routeTree.gen.ts`: arquivo gerado pelo TanStack Router, nao editar manualmente

### Regras de frontend

- Toda nova implementacao de frontend deve acontecer em `frontend/`.
- Utilizar sempre `pnpm` para instalar dependencias e executar scripts do frontend.
- Preferir TypeScript em todos os arquivos de interface e logica de cliente.
- Seguir os padroes do shadcn/ui para componentes base e composicao visual.
- Usar TanStack Router para definicao de rotas, loaders e protecao de navegacao.
- Concentrar integracoes HTTP e utilitarios compartilhados em `lib/` e organizacao por dominio em `features/`.

### HATEOAS (link resolver)

Quando consumir `_links` do backend, manter um resolver que converta `href` absoluto em path relativo removendo o prefixo `/api` antes de chamar o client.

Exemplo:

```ts
export const resolveLink = (linkObj?: { href?: string } | null) => {
  if (!linkObj?.href) return null;
  const url = new URL(linkObj.href);
  return url.pathname.replace("/api", "");
};
```

### React e estado

- Evitar `setState` sincrono em `useEffect` quando o valor puder ser derivado.
- Preferir estado derivado em render ou funcoes utilitarias.
- Usar efeitos apenas para efeitos colaterais reais.
- Ao trabalhar com formulários, manter estado editavel minimo e derivar defaults quando possivel.

## Checklist Rapido

- Backend:
  - Mudou schema? adicionar migration Flyway.
  - Criou ou alterou DTO? manter como `record` e atualizar MapStruct.
  - Criou endpoint? manter HATEOAS/HAL e Swagger quando fizer sentido.
  - Erros? manter padrao `ProblemDetail`.
- Frontend:
  - Implementar no diretorio `frontend/`.
  - Utilizar sempre `pnpm`.
  - Manter TypeScript como padrao.
  - Rotas novas devem seguir TanStack Router.
  - Componentes base e estilos devem seguir a abordagem shadcn/ui.
  - Nao armazenar refresh token em `localStorage`.
