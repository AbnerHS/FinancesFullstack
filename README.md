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
- Oracle Database Free 21c
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
- persistencia com Oracle, JPA/Hibernate e migracoes com Flyway
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

- Oracle Database
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
```

Depois inicie o servidor de desenvolvimento:

```bash
pnpm dev
```

O frontend sera servido pelo Vite, normalmente em:

```text
http://localhost:5173
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
- reduzir diferencas entre o ambiente Oracle e o ambiente de testes
