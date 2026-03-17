export function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const response = error.response as {
      data?: { detail?: string; message?: string }
    }

    return response.data?.detail || response.data?.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
