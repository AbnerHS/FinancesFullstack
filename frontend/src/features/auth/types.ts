export type AuthUser = {
  id: string
  name: string
  email: string
  authProvider: "LOCAL" | "GOOGLE"
}

export type AuthResponse = {
  accessToken: string
  user: AuthUser
}

export type LoginInput = {
  email: string
  password: string
}

export type GoogleLoginInput = {
  code: string
}

export type SignUpInput = {
  name: string
  email: string
  password: string
}
