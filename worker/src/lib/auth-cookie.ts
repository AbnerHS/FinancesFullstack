import type { Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import type { AppEnv } from "../types.ts"

// Cookie do refresh token, igual ao AuthenticationController do Java.
const REFRESH_COOKIE = "refresh_token"
const REFRESH_COOKIE_PATH = "/api/auth"

const sameSite = (value: string) => {
  const normalized = value.toLowerCase()
  return normalized === "none" ? "None" : normalized === "strict" ? "Strict" : "Lax"
}

export function setRefreshCookie(c: Context<AppEnv>, token: string) {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: c.env.JWT_REFRESH_COOKIE_SECURE === "true",
    sameSite: sameSite(c.env.JWT_REFRESH_COOKIE_SAME_SITE),
    path: REFRESH_COOKIE_PATH,
    maxAge: Math.floor(Number(c.env.JWT_REFRESH_TOKEN_EXPIRATION_MS) / 1000),
  })
}

export const getRefreshCookie = (c: Context) => getCookie(c, REFRESH_COOKIE)

export const clearRefreshCookie = (c: Context) => deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
