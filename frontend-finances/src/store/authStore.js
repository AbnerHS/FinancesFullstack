import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';


let refreshRequestPromise = null;


export const useAuthStore = create(
    persist(
        (set, get) => ({
            accessToken: null,
            user: null,
            setAccessToken: ({ accessToken }) => {
                set({ accessToken: accessToken || null });
            },
            clearTokens: () => {
                set({ accessToken: null, user: null });
            },
            setUser: ({ user }) => set({ user }),
            refreshAccessToken: async () => {
                if (refreshRequestPromise) {
                    return refreshRequestPromise;
                }
                refreshRequestPromise = authService.refreshAuthToken()
                    .then(({ accessToken, user }) => {
                        get().setAccessToken({ accessToken: accessToken });
                        if (user) {
                            get().setUser({ user });
                        }
                        return accessToken;
                    })
                    .catch((error) => {
                        get().clearTokens();
                        throw error;
                    })
                    .finally(() => {
                        refreshRequestPromise = null;
                    });

                return refreshRequestPromise;
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);        
