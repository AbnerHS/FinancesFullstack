/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { login as loginService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState(null); 
  // TODO: Adicionar estado para informações do usuário (ex: user, setUser)
  
  const navigate = useNavigate();

  useEffect(() => {
    // Se um token existir no localStorage, configura o header da API ao carregar a app
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  const login = async (email, password) => {
    try {
      // Executa o login, salva o token e navega para a página principal
      const { token, user: userData } = await loginService(email, password);
      localStorage.setItem('authToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setUser(userData);
      navigate('/');
    } catch (error) {
      // Verifica se o erro tem a estrutura esperada da API
      if (error.response && error.response.data && error.response.data.title) {
        throw new Error(error.response.data.title);
      }
      // Lança um erro genérico caso contrário
      throw new Error('Ocorreu um erro inesperado. Tente novamente.');
    }
  };

  const logout = () => {
    // Limpa o token e redireciona para a página de login
    localStorage.removeItem('authToken');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
