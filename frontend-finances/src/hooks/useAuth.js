import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

export const useLogin = () => {
    const navigate = useNavigate();
    const { setUser, setAccessToken } = useAuthStore();

    return useMutation({
        mutationFn: authService.login,
        onSuccess: (data) => {
            setAccessToken({ accessToken: data.accessToken });
            setUser({ user: data.user });
            navigate('/dashboard');
        },
        onError: (error) => {
            console.error("Erro no login:", error.response?.data || error.message);
        }
    });
};

export const useRegister = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: authService.register,
        onSuccess: () => {
            navigate('/login'); // Ou já loga o usuário direto
        }
    });
};