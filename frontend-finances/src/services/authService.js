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
