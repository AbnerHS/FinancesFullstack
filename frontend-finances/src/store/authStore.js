import { create } from 'zustand';

export const useAuthStore = create((set) => ({
    setTokens: ({ accessToken }) => {
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        set({ accessToken });
    },
    clearTokens: () => {
        localStorage.removeItem('accessToken');
        set({ accessToken: null });
    },
    accessToken: localStorage.getItem('accessToken') || null,
}));