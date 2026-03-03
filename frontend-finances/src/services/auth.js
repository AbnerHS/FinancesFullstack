import { useMutation } from '@tanstack/react-query';
import { AxiosInstance } from './AxiosInstance';

export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await AxiosInstance.post('/auth/authenticate', {
        email,
        password,
      });
      return response.data;
    },
  });
}

export const useRegister = () => {
  return useMutation({
    mutationFn: async (data) => {
      const response = await AxiosInstance.post('/auth/register', data);
      return response.data;
    },
  })
}