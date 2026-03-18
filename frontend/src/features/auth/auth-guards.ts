import { redirect } from "@tanstack/react-router"

import { useAuthStore } from "@/stores/auth-store.ts"

export function requireAuth() {
  if (!useAuthStore.getState().accessToken) {
    throw redirect({ to: "/login" })
  }
}

export function requireGuest() {
  if (useAuthStore.getState().accessToken) {
    throw redirect({ to: "/" })
  }
}
