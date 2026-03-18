# Sistema de gestao financeira pessoal e compartilhada

Projeto de pratica e estudo com backend Java/Spring Boot e frontend React para controle financeiro pessoal e compartilhado.

## Visao geral

O projeto esta dividido em duas aplicacoes principais:

- `rest-api-finances`: API REST responsavel por autenticacao, usuarios, planos financeiros, periodos, transacoes, cartoes e faturas.
- `frontend`: interface web atual do projeto.

## Stack tecnologica

### Backend

- Java 21
- Spring Boot
- Spring Web MVC
- Spring Data JPA / Hibernate
- Spring Security com JWT
- Spring HATEOAS
- Flyway
- MapStruct
- MySQL 8 (inicialmente desenvolvido com Oracle Databrase Free 21c)
- Docker e Docker Compose
- Swagger / OpenAPI via Springdoc

### Frontend

- React 19
- TypeScript 5
- Vite 7
- TanStack Router
- TanStack Query
- shadcn/ui
- Tailwind CSS 4
- Zustand
- Axios
- React Hook Form
- Lucide React
- ESLint
- Prettier

## Estado atual do projeto

### Backend

O backend possui:

- autenticacao com access token e refresh token em cookie HttpOnly
- endpoints para usuarios, planos financeiros, periodos, transacoes, cartoes e faturas
- documentacao interativa com Swagger
- persistencia com MySQL, JPA/Hibernate e migracoes com Flyway
- estrutura REST com HATEOAS

### Frontend

O frontend ativo esta em desenvolvimento em `frontend/`. Atualmente a aplicacao usa:

- React com TypeScript
- roteamento com TanStack Router
- componentes base com shadcn/ui
- Tailwind CSS para estilos
- gerenciamento de estado com Zustand
- integracoes assincoras com TanStack Query e Axios

A estrutura principal do frontend inclui:

- `frontend/src/components`
- `frontend/src/features`
- `frontend/src/layouts`
- `frontend/src/lib`
- `frontend/src/pages`
- `frontend/src/routes`
- `frontend/src/stores`

## Documentacao da API

A documentacao da API com Swagger esta implementada no backend.

Depois de iniciar a API, a documentacao pode ser acessada em:

- `http://localhost:8080/swagger-ui.html`
- `http://localhost:8080/swagger-ui/index.html`

## Testes

Os testes estao em desenvolvimento.

### Stack de testes atual

- JUnit 5
- Mockito
- Spring Boot Test
- MockMvc
- JaCoCo para coverage
- H2 em perfil de teste para execucao local da suite

### Escopo atual

Ja existem testes unitarios e de integracao cobrindo parte dos servicos centrais, autenticacao e fluxos HTTP principais. A suite segue evoluindo com foco em:

- casos de sucesso e erro
- cobertura de regras de negocio
- validacao de respostas HTTP e tratamento de excecoes
- aumento progressivo de coverage

## Estrutura do repositorio

```text
finances/
|-- rest-api-finances/
|-- frontend/
|-- frontend-finances/
|-- README.md
```

## Como iniciar

### Pre-requisitos

- Java 21
- Node.js 20+
- pnpm
- Docker e Docker Compose

### 1. Iniciar o backend com Docker

No diretorio `rest-api-finances`:

```bash
docker compose up -d
```

Isso sobe:

- MySQL
- aplicacao Spring Boot

API padrao:

```text
http://localhost:8080
```

Swagger:

```text
http://localhost:8080/swagger-ui.html
```

### 2. Iniciar o frontend

No diretorio `frontend`, instale as dependencias:

```bash
pnpm install
```

Configure o ambiente do frontend com a URL base da API, por exemplo:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID_DO_GOOGLE
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

Depois inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

O frontend sera servido pelo Vite, normalmente em:

```text
http://localhost:5173
```

### Deploy do frontend na Vercel

Para publicar apenas o frontend na Vercel, use `frontend/` como Root Directory do projeto.

Arquivos de referencia disponiveis:

- `frontend/.env.example`: desenvolvimento local com proxy do Vite
- `frontend/.env.production.example`: producao apontando para a API publica
- `frontend/vercel.json`: rewrite para SPA com TanStack Router

Variavel obrigatoria na Vercel:

```env
VITE_API_BASE_URL=https://SUA_API_PUBLICA/api
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID_DO_GOOGLE
VITE_GOOGLE_REDIRECT_URI=https://SEU_FRONTEND_PUBLICO/auth/google/callback
```

Importante:

- se o frontend estiver na Vercel, a API precisa estar acessivel por `https`; um IP publico servido apenas por `http` sera bloqueado pelo navegador por mixed content
- como o frontend usa `withCredentials`, o backend precisa permitir CORS com a origem da Vercel em `APP_CORS_ALLOWED_ORIGINS`
- para o refresh token funcionar entre dominios, configure no backend:

```env
JWT_REFRESH_COOKIE_SECURE=true
JWT_REFRESH_COOKIE_SAME_SITE=None
APP_CORS_ALLOWED_ORIGINS=https://SEU-PROJETO.vercel.app
```

Exemplo para o dominio que voce esta usando agora:

```env
APP_CORS_ALLOWED_ORIGINS=https://finances-fullstack.vercel.app
JWT_REFRESH_COOKIE_SECURE=true
JWT_REFRESH_COOKIE_SAME_SITE=None
```

Se quiser deixar a VM aceitar mais de um dominio temporario, tambem pode usar patterns:

```env
APP_CORS_ALLOWED_ORIGIN_PATTERNS=https://*.vercel.app,https://*.ngrok-free.dev
```

Exemplo de desenvolvimento local mantendo o proxy do Vite:

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://SEU_IP_PUBLICO:8080
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID_DO_GOOGLE
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

No backend, `GOOGLE_OAUTH_REDIRECT_URI` deve apontar exatamente para o mesmo callback configurado no frontend:

```env
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### 3. Rodar os testes do backend

No diretorio `rest-api-finances`:

```bash
mvn test
```

Relatorio de coverage JaCoCo:

```text
rest-api-finances/target/site/jacoco/index.html
```

## Proximos passos

- ampliar a cobertura de testes unitarios e de integracao
- evoluir a cobertura dos controllers e filtros de seguranca
- continuar a evolucao do frontend em `frontend/`
- melhorar a experiencia visual e os fluxos de uso da interface
- reduzir diferencas entre o ambiente MySQL e o ambiente de testes
