import { http } from "@/lib/api/http.ts"
import type {
  AuthResponse,
  GoogleLoginInput,
  LoginInput,
  SignUpInput,
} from "@/features/auth/types.ts"

export const authService = {
  async login(payload: LoginInput) {
    const { data } = await http.post<AuthResponse>("/auth/login", payload)
    return data
  },
  async loginWithGoogle(payload: GoogleLoginInput) {
    const { data } = await http.post<AuthResponse>("/auth/google", payload)
    return data
  },
  async register(payload: SignUpInput) {
    const { data } = await http.post<AuthResponse>("/auth/register", payload)
    return data
  },
  async refreshAuthToken() {
    const { data } = await http.post<AuthResponse>("/auth/refresh", {})
    return data
  },
}
