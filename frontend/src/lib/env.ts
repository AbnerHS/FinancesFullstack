const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const readRequiredEnv = (key: "VITE_GOOGLE_CLIENT_ID" | "VITE_GOOGLE_REDIRECT_URI") => {
  const value = import.meta.env[key]?.trim()

  if (value) {
    return value
  }

  throw new Error(`${key} não foi configurada.`)
}

const readApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl)
  }

  if (import.meta.env.DEV) {
    return "/api"
  }

  throw new Error("VITE_API_BASE_URL não foi configurada para o build de produção.")
}

export const apiBaseUrl = readApiBaseUrl()
export const googleClientId = readRequiredEnv("VITE_GOOGLE_CLIENT_ID")
export const googleRedirectUri = readRequiredEnv("VITE_GOOGLE_REDIRECT_URI")

export const googleAuthorizationUrl = (() => {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")

  url.searchParams.set("client_id", googleClientId)
  url.searchParams.set("redirect_uri", googleRedirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")

  return url.toString()
})()
