import axios from "axios"

import { apiBaseUrl } from "@/lib/env.ts"
import { useAuthStore } from "@/stores/auth-store.ts"

type RetriableConfig = {
  _retry?: boolean
  headers?: Record<string, string>
  url?: string
}

export const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

http.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  } else {
    delete config.headers.Authorization
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableConfig | undefined
    const statusCode = error.response?.status

    if (!originalRequest || statusCode !== 403 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/register")
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newAccessToken = await useAuthStore.getState().refreshAccessToken()
      if (!newAccessToken) {
        return Promise.reject(error)
      }

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      }

      return http(originalRequest)
    } catch (refreshError) {
      useAuthStore.getState().clearTokens()
      return Promise.reject(refreshError)
    }
  }
)
