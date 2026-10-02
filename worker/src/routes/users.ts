import { Hono } from "hono"
import { z } from "zod"
import { setRefreshCookie } from "../lib/auth-cookie.ts"
import { collection } from "../lib/hal.ts"
import { signToken } from "../lib/jwt.ts"
import { validate } from "../lib/validation.ts"
import * as cards from "../services/cards.ts"
import * as plans from "../services/plans.ts"
import * as users from "../services/users.ts"
import type { AppEnv } from "../types.ts"

const updateSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório"),
  email: z.string().trim().pipe(z.email("Email inválido")),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
})

export const userRoutes = new Hono<AppEnv>()
  .get("/me", (c) => c.json(users.userModel(c.var.user)))
  .patch("/me", validate("json", updateSchema), async (c) => {
    const { user, emailChanged } = await users.updateMe(c.var.db, c.var.user, c.req.valid("json"))
    // Os tokens usam o e-mail como `sub`: com e-mail novo, o access token atual deixa de valer.
    // Um refresh cookie novo deixa o interceptor do frontend renovar a sessão no próximo 401.
    if (emailChanged) setRefreshCookie(c, await signToken(c.env, "refresh", user.email))
    return c.json(users.userModel(user))
  })
  .put("/me/password", validate("json", passwordSchema), async (c) => {
    await users.updatePassword(c.env, c.var.db, c.var.user, c.req.valid("json"))
    return c.body(null, 204)
  })
  .get("/me/plans", async (c) =>
    c.json(collection("plans", await plans.listForUser(c.var.db, c.var.user), "/api/users/me/plans")),
  )
  .get("/me/credit-cards", async (c) => {
    const list = await cards.listByUser(c.var.db, c.var.user.id)
    return c.json(collection("creditCards", list.map(cards.cardModel), "/api/users/me/credit-cards"))
  })
  .get("/:id", async (c) => c.json(users.userModel(await users.findVisibleUser(c.var.db, c.var.user, c.req.param("id")))))
