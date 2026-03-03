import axios from 'axios';

export const AxiosInstance = axios.create({
  baseURL: 'http://192.168.0.115:8080/api', // TODO: Mover para variável de ambiente
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('accessToken') || ""}`,
  }
});
