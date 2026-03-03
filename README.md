# 💰 Sistema de gestão financeira pessoal e compartilhada

*Projeto de prática e aprendizado de stacks*

## 🛠️ Stack Tecnológica

### **Back-end (API Rest)**
* **Core:** Java 21 + Spring Boot 3
* **Banco de Dados:** Oracle Database 21c (via Docker)
* **Persistência:** Spring Data JPA / Hibernate
* **Mapeamento:** MapStruct (Entity <-> DTO)
* **Segurança:** Implementação de autenticação e autorização via **Spring Security & JWT**.
* **Navegabilidade:** Spring HATEOAS (Nível 3 de Maturidade REST)
* **Containerização:** Docker & Docker Compose

### **Front-end Web (Em breve)**
* **Framework:** React.js
* **Estilização:** Tailwind CSS (Design responsivo e utilitário)

### **Mobile (Em breve)**
* **Framework:** React Native
* **Estilização:** Nativewind (Tailwind para ambientes nativos)

---

## 🚀 Próximos Passos

- [ ] **Front-end Web:** Dashboard para controle de gastos e receitas mensais.
- [ ] **Mobile:** Aplicativo para registro rápido de despesas no dia a dia.
- [ ] **Relatórios:** Geração de gráficos de evolução patrimonial e gastos por categoria.
- [ ] **Documentação:** Documentação interativa de todos os endpoints utilizando **Swagger / OpenAPI 3**.
- [ ] **Testes:** Implementação de testes unitários e de integração utilizando **JUnit 5**, **Mockito** e **Testcontainers** para validar o comportamento com o banco Oracle.

---

## 🔧 Como Iniciar (API)

### Pré-requisitos
* Docker e Docker Compose instalados.

1. Suba o container (Spring Boot + Oracle): `docker-compose up -d`
