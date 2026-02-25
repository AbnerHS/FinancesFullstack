import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080', // TODO: Mover para variável de ambiente
});

export default api;
