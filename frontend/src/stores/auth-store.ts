import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { AuthUser } from "@/features/auth/types.ts"

type AuthStoreState = {
  accessToken: string | null
  user: AuthUser | null
  setAccessToken: (payload: { accessToken: string | null }) => void
  setUser: (payload: { user: AuthUser | null }) => void
  clearTokens: () => void
  refreshAccessToken: () => Promise<string>
}

let refreshRequestPromise: Promise<string> | null = null

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setAccessToken: ({ accessToken }) => {
        set({ accessToken: accessToken ?? null })
      },
      setUser: ({ user }) => {
        set({ user })
      },
      clearTokens: () => {
        set({ accessToken: null, user: null })
      },
      refreshAccessToken: async () => {
        if (refreshRequestPromise) {
          return refreshRequestPromise
        }

        refreshRequestPromise = import("@/features/auth/auth-service.ts")
          .then(({ authService }) => authService.refreshAuthToken())
          .then(({ accessToken, user }) => {
            get().setAccessToken({ accessToken })
            get().setUser({ user })
            return accessToken
          })
          .catch((error: unknown) => {
            get().clearTokens()
            throw error
          })
          .finally(() => {
            refreshRequestPromise = null
          })

        return refreshRequestPromise
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
)
