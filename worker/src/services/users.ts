import { eq } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type User, users } from "../db/schema.ts"
import { ApiError, forbidden, notFound, unauthorized } from "../lib/errors.ts"
import { isUniqueViolation } from "../lib/db-errors.ts"
import { hashPassword, resolveIterations, verifyPassword } from "../lib/password.ts"
import { sharesPlan } from "./access.ts"
import { normalizeEmail, toUserResponse } from "./auth.ts"

// Porta do UserService.

export const userModel = (user: User) => ({
  ...toUserResponse(user),
  _links: {
    self: { href: `/api/users/${user.id}` },
    plans: { href: "/api/users/me/plans" },
    "credit-cards": { href: "/api/users/me/credit-cards" },
  },
})

/** Só expõe usuários que compartilham algum plano com quem pede (o Java expunha qualquer um). */
export async function findVisibleUser(db: Database, current: User, id: string): Promise<User> {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user || !(await sharesPlan(db, current.id, user.id))) {
    throw notFound("Usuário não encontrado!")
  }
  return user
}

export async function updateMe(
  db: Database,
  current: User,
  input: { name: string; email: string },
): Promise<{ user: User; emailChanged: boolean }> {
  const email = normalizeEmail(input.email)
  if (current.authProvider === "GOOGLE" && email !== current.email) {
    throw forbidden("Contas com login Google não podem alterar o email.")
  }

  try {
    const [user] = await db
      .update(users)
      .set({ name: input.name.trim(), email })
      .where(eq(users.id, current.id))
      .returning()
    return { user: user!, emailChanged: email !== current.email }
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError(409, "Conflito", "E-mail já cadastrado")
    throw error
  }
}

export async function updatePassword(
  env: Env,
  db: Database,
  current: User,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  if (current.authProvider === "GOOGLE") {
    throw forbidden("Contas com login Google não podem alterar a senha.")
  }
  if (!(await verifyPassword(input.currentPassword, current.password))) {
    throw unauthorized("Senha atual incorreta")
  }
  const password = await hashPassword(input.newPassword, resolveIterations(env.PASSWORD_PBKDF2_ITERATIONS))
  await db.update(users).set({ password }).where(eq(users.id, current.id))
}
