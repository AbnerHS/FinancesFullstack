import { ApiError, badRequest, unauthorized } from "../lib/errors.ts"

// Porta do GoogleOAuthClient: troca o authorization code por um access token e lê o perfil.

export type GoogleUserProfile = {
  subject: string
  email: string
  name: string | null
  emailVerified: boolean
}

type GoogleEnv = Pick<
  Env,
  | "GOOGLE_OAUTH_CLIENT_ID"
  | "GOOGLE_OAUTH_CLIENT_SECRET"
  | "GOOGLE_OAUTH_REDIRECT_URI"
  | "GOOGLE_OAUTH_TOKEN_URI"
  | "GOOGLE_OAUTH_USERINFO_URI"
>

const communicationFailure = () => new ApiError(502, "Falha no provedor externo", "Falha ao comunicar com Google")

async function request<T>(input: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    throw communicationFailure()
  }
  if (response.status >= 400 && response.status < 500) {
    throw unauthorized("Credenciais do Google invalidas")
  }
  if (!response.ok) {
    throw communicationFailure()
  }
  return response.json<T>()
}

export async function fetchGoogleProfile(env: GoogleEnv, code: string): Promise<GoogleUserProfile> {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw badRequest("Configuracao do Google OAuth2 esta incompleta")
  }

  const token = await request<{ access_token?: string }>(env.GOOGLE_OAUTH_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })
  if (!token.access_token) {
    throw badRequest("Resposta invalida ao trocar codigo com Google")
  }

  const info = await request<{ sub?: string; email?: string; name?: string; email_verified?: boolean }>(
    env.GOOGLE_OAUTH_USERINFO_URI,
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  )
  if (!info.sub) {
    throw badRequest("Resposta do Google sem identificador do usuario")
  }
  if (!info.email) {
    throw badRequest("Resposta do Google sem e-mail do usuario")
  }
  if (info.email_verified !== true) {
    throw unauthorized("Conta Google sem e-mail verificado")
  }

  return { subject: info.sub, email: info.email, name: info.name ?? null, emailVerified: true }
}
