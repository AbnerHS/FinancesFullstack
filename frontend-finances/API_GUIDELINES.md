# Padrões para Comunicação com a API

Este documento descreve as boas práticas e os padrões a serem seguidos ao criar ou manter serviços de comunicação com a API neste projeto.

## 1. Instância Centralizada do `axios`

Toda a comunicação com a API deve, obrigatoriamente, utilizar a instância centralizada do `axios` exportada de `src/services/api.js`.

Isso garante que todas as requisições compartilhem uma configuração base (como a `baseURL`) e facilita a adição de `interceptors` para lidar com renovação de token ou outras necessidades globais no futuro.

**Exemplo (`src/services/api.js`):**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080', // TODO: Mover para variável de ambiente
});

export default api;
```

## 2. Camada de Serviço (Service Layer)

Para cada recurso da API (ex: Autenticação, Transações, Usuários), deve ser criado um arquivo de serviço correspondente dentro da pasta `src/services/`.

**Exemplos de arquivos:**
- `src/services/authService.js`
- `src/services/transactionService.js`
- `src/services/userService.js`

## 3. Padrão das Funções de Serviço

As funções dentro dos arquivos de serviço devem seguir as seguintes regras:

- Ser `async`.
- Encapsular a chamada à API (`api.get`, `api.post`, etc.).
- Receber os parâmetros necessários para a requisição (ID, corpo da requisição, etc.).
- Em caso de sucesso, retornar apenas os dados da resposta (`response.data`).
- **Não devem conter blocos `try...catch`**. A responsabilidade de tratar erros é da camada que chama a função (Context, Hook ou Componente).

**Exemplo (`src/services/authService.js`):**
```javascript
import api from './api';

/**
 * Envia as credenciais de login para a API.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string}>}
 */
export const login = async (email, password) => {
  const response = await api.post('/api/auth/authenticate', {
    email,
    password,
  });
  return response.data;
};
```

## 4. Padrão de Tratamento de Erros

O tratamento de erros deve ocorrer na camada que consome o serviço (por exemplo, um Contexto, Hook ou Componente), envolvendo a chamada da função em um bloco `try...catch`.

O bloco `catch` deve inspecionar o objeto de erro do `axios` para extrair uma mensagem de erro amigável, seguindo o formato padrão da API.

**Formato do Erro da API:**
```json
{
    "detail": "Bad credentials",
    "instance": "/api/auth/authenticate",
    "status": 401,
    "title": "Credenciais inválidas",
    "timestamp": "2026-02-25T01:53:03.456908734"
}
```

**Exemplo de implementação no `AuthContext.jsx`:**

```javascript
// ...

const login = async (email, password) => {
  try {
    const { token } = await loginService(email, password);
    // ... lógica de sucesso
  } catch (error) {
    // 1. Verifica se o erro possui a estrutura esperada da API
    if (error.response && error.response.data && error.response.data.title) {
      // 2. Lança um novo erro contendo a mensagem amigável do campo "title"
      throw new Error(error.response.data.title);
    }
    // 3. Se não for um erro da API, lança um erro genérico
    throw new Error('Ocorreu um erro inesperado. Tente novamente.');
  }
};

// ...
```

A página ou componente que chama `login()` irá então usar `try...catch` para capturar este erro final e exibir a `error.message` para o usuário.
