# Sistema de gestão financeira pessoal e compartilhada

Projeto de prática e estudo com backend Java/Spring Boot e frontend React para controle financeiro pessoal e compartilhado.

## Visao geral

O projeto está dividido em duas aplicaçoes:

- `rest-api-finances`: API REST responsavel por autenticação, usuários, planos financeiros, períodos, transações, cartões e faturas.
- `frontend-finances`: interface web em desenvolvimento, consumindo a API para login, cadastro e operação do dashboard financeiro.

## Stack tecnologica

### Backend

- Java 21
- Spring Boot 4
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
- Vite 7
- React Router
- React Query
- Axios
- Zustand
- React Hook Form
- Tailwind CSS 4
- Lucide React
- ESLint

## Estado atual do projeto

### Backend

O backend possui:

- autenticação com access token e refresh token em cookie HttpOnly
- endpoints para usuários, planos financeiros, períodos, transações, cartões e faturas
- documentação interativa com Swagger
- persistencia com Oracle, JPA/Hibernate e migrações com Flyway
- estrutura REST com HATEOAS

### Frontend

O frontend está em desenvolvimento ativo. Atualmente a aplicação possui:

- fluxo de autenticação com login e cadastro
- rotas públicas e protegidas
- dashboard principal conectado a hooks e stores
- integração com a API para usuários, planos, períodos, transações, cartões e faturas
- gerenciamento de estado de autenticação com Zustand
- consumo de dados assincros com React Query
- organização por `pages`, `components`, `hooks`, `services` e `store`

Hoje o foco da interface está no dashboard e nos fluxos operacionais principais, com componentes para:

- estatisticas gerais
- seleção de planos e períodos
- painel e tabela de transações
- gerenciamento de cartões
- gerenciamento de faturas
- gerenciamento de parceria em planos

## Documentação da API

A documentação da API com Swagger está implementada no backend.

Depois de iniciar a API, a documentação pode ser acessada em:

- `http://localhost:8080/swagger-ui.html`
- `http://localhost:8080/swagger-ui/index.html`

## Testes

Os testes estão em desenvolvimento.

### Stack de testes atual

- JUnit 5
- Mockito
- Spring Boot Test
- MockMvc
- JaCoCo para coverage
- H2 em perfil de teste para execucao local da suite

### Escopo atual

No momento já existem testes unitários e de integração cobrindo parte dos servicos centrais, autenticação e fluxos HTTP principais. A suite está sendo expandida gradualmente com foco em:

- casos de sucesso e casos de erro
- cobertura de regras de negócio
- validação de respostas HTTP e tratamento de exceções
- aumento progressivo de coverage

## Estrutura do repositorio

```text
finances/
|-- rest-api-finances/
|-- frontend-finances/
|-- README.md
```

## Como iniciar

### Pre-requisitos

- Java 21
- Node.js 20+ e npm
- Docker e Docker Compose

### 1. Iniciar o backend com Docker

No diretorio `rest-api-finances`:

```bash
docker-compose up -d
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

No diretorio `frontend-finances`, instale as dependencias:

```bash
npm install
```

Crie um arquivo `.env` no frontend com a URL base da API:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Depois inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O frontend será servido pelo Vite, normalmente em:

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

- ampliar a cobertura de testes unitarios e de integração
- evoluir a cobertura dos controllers e filtros de seguranca
- continuar a evolução do dashboard frontend
- melhorar a experiencia visual e os fluxos de uso do frontend
- reduzir diferencas entre o ambiente Oracle e o ambiente de testes
