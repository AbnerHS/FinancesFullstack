import { Hono } from "hono"
import type { Context } from "hono"
import { z } from "zod"
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from "../lib/auth-cookie.ts"
import { validate } from "../lib/validation.ts"
import * as auth from "../services/auth.ts"
import { fetchGoogleProfile } from "../services/google-oauth.ts"
import type { AppEnv } from "../types.ts"

// Porta do AuthenticationController. O refresh token vai só no cookie HttpOnly; o corpo
// devolve { accessToken, user }, como o withoutRefreshToken() do Java.

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

function respond(c: Context<AppEnv>, result: auth.AuthResult) {
  setRefreshCookie(c, result.refreshToken)
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
  .post("/refresh", async (c) => respond(c, await auth.refresh(c.env, c.var.db, getRefreshCookie(c))))
  // Novo: o backend Java não tinha logout, então o cookie de refresh sobrevivia ao "sair".
  .post("/logout", (c) => {
    clearRefreshCookie(c)
    return c.body(null, 204)
  })
