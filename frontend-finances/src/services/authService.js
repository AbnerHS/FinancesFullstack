// /services/authService.js
import { AxiosInstance } from './AxiosInstance';

export const authService = {
  login: async ({ email, password }) => {
    const { data } = await AxiosInstance.post('/auth/login', { email, password });
    return data;
  },
  
  register: async (userData) => {
    const { data } = await AxiosInstance.post('/auth/register', userData);
    return data;
  },

  refreshAuthToken: async () => {
    // Note que enviamos um corpo vazio porque o refresh_token está no Cookie HttpOnly
    const { data } = await AxiosInstance.post('/auth/refresh', {}, { withCredentials: true });
    return data;
  }
};