import { Hono } from "hono"
import type { Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { z } from "zod"
import { validate } from "../lib/validation.ts"
import * as auth from "../services/auth.ts"
import { fetchGoogleProfile } from "../services/google-oauth.ts"
import type { AppEnv } from "../types.ts"

// Porta do AuthenticationController. O refresh token vai só no cookie HttpOnly; o corpo
// devolve { accessToken, user }, como o withoutRefreshToken() do Java.

const REFRESH_COOKIE = "refresh_token"
const REFRESH_COOKIE_PATH = "/api/auth"

const registerSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório."),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
  password: z.string().min(6, "Use pelo menos 6 caracteres."),
})

const loginSchema = z.object({
  email: z.string().min(1, "O email é obrigatório."),
  password: z.string().min(1, "A senha é obrigatória."),
})

const googleSchema = z.object({
  code: z.string().trim().min(1, "Codigo de autorizacao do Google e obrigatorio"),
})

const sameSite = (value: string) => {
  const normalized = value.toLowerCase()
  return normalized === "none" ? "None" : normalized === "strict" ? "Strict" : "Lax"
}

function respond(c: Context<AppEnv>, result: auth.AuthResult) {
  setCookie(c, REFRESH_COOKIE, result.refreshToken, {
    httpOnly: true,
    secure: c.env.JWT_REFRESH_COOKIE_SECURE === "true",
    sameSite: sameSite(c.env.JWT_REFRESH_COOKIE_SAME_SITE),
    path: REFRESH_COOKIE_PATH,
    maxAge: Math.floor(Number(c.env.JWT_REFRESH_TOKEN_EXPIRATION_MS) / 1000),
  })
  return c.json({ accessToken: result.accessToken, user: result.user })
}

export const authRoutes = new Hono<AppEnv>()
  .post("/register", validate("json", registerSchema), async (c) =>
    respond(c, await auth.register(c.env, c.var.db, c.req.valid("json"))),
  )
  .post("/login", validate("json", loginSchema), async (c) =>
    respond(c, await auth.login(c.env, c.var.db, c.req.valid("json"))),
  )
  .post("/google", validate("json", googleSchema), async (c) => {
    const profile = await fetchGoogleProfile(c.env, c.req.valid("json").code)
    return respond(c, await auth.loginWithGoogle(c.env, c.var.db, profile))
  })
  .post("/refresh", async (c) => respond(c, await auth.refresh(c.env, c.var.db, getCookie(c, REFRESH_COOKIE))))
  // Novo: o backend Java não tinha logout, então o cookie de refresh sobrevivia ao "sair".
  .post("/logout", (c) => {
    deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH })
    return c.body(null, 204)
  })
