import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { authService } from "@/features/auth/auth-service.ts"
import type { GoogleLoginInput, LoginInput, SignUpInput } from "@/features/auth/types.ts"
import { useAuthStore } from "@/stores/auth-store.ts"

function useAuthSuccessHandler() {
  const navigate = useNavigate()
  const { setAccessToken, setUser } = useAuthStore()

  return async (data: Awaited<ReturnType<typeof authService.login>>) => {
    setAccessToken({ accessToken: data.accessToken })
    setUser({ user: data.user })
    await navigate({ to: "/" })
  }
}

export function useLogin() {
  const onSuccess = useAuthSuccessHandler()

  return useMutation({
    mutationFn: (payload: LoginInput) => authService.login(payload),
    onSuccess,
  })
}

export function useRegister() {
  const onSuccess = useAuthSuccessHandler()

  return useMutation({
    mutationFn: (payload: SignUpInput) => authService.register(payload),
    onSuccess,
  })
}

export function useGoogleLogin() {
  const onSuccess = useAuthSuccessHandler()

  return useMutation({
    mutationFn: (payload: GoogleLoginInput) => authService.loginWithGoogle(payload),
    onSuccess,
  })
}
