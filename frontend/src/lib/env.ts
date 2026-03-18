const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "")

const readApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configuredBaseUrl) {
    return trimTrailingSlash(configuredBaseUrl)
  }

  if (import.meta.env.DEV) {
    return "/api"
  }

  throw new Error(
    "VITE_API_BASE_URL nao foi configurada para o build de producao."
  )
}

export const apiBaseUrl = readApiBaseUrl()
