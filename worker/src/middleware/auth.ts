import { eq } from "drizzle-orm"
import { createMiddleware } from "hono/factory"
import { users } from "../db/schema.ts"
import { unauthorized } from "../lib/errors.ts"
import { verifyToken } from "../lib/jwt.ts"
import { normalizeEmail } from "../services/auth.ts"
import type { AppEnv } from "../types.ts"

// Equivalente ao JwtAuthenticationFilter + SecurityConfiguration: exige Bearer access token
// válido e carrega o usuário em `c.get("user")`.
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization")
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized("Token de acesso ausente")
  }

  const email = await verifyToken(c.env, "access", header.slice(7))
  if (!email) {
    throw unauthorized("Token de acesso inválido ou expirado")
  }

  const user = await c.var.db.query.users.findFirst({ where: eq(users.email, normalizeEmail(email)) })
  if (!user) {
    throw unauthorized("Usuário não encontrado")
  }

  c.set("user", user)
  await next()
})
