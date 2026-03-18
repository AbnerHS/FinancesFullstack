import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { authService } from "@/features/auth/auth-service.ts"
import type { LoginInput, SignUpInput } from "@/features/auth/types.ts"
import { useAuthStore } from "@/stores/auth-store.ts"

export function useLogin() {
  const navigate = useNavigate()
  const { setAccessToken, setUser } = useAuthStore()

  return useMutation({
    mutationFn: (payload: LoginInput) => authService.login(payload),
    onSuccess: async (data) => {
      setAccessToken({ accessToken: data.accessToken })
      setUser({ user: data.user })
      await navigate({ to: "/" })
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const { setAccessToken, setUser } = useAuthStore()

  return useMutation({
    mutationFn: (payload: SignUpInput) => authService.register(payload),
    onSuccess: async (data) => {
      setAccessToken({ accessToken: data.accessToken })
      setUser({ user: data.user })
      await navigate({ to: "/" })
    },
  })
}
