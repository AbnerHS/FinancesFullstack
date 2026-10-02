import { eq } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type User, users } from "../db/schema.ts"
import { ApiError, unauthorized } from "../lib/errors.ts"
import { signToken, verifyToken } from "../lib/jwt.ts"
import { hashPassword, needsRehash, verifyPassword } from "../lib/password.ts"
import type { GoogleUserProfile } from "./google-oauth.ts"

// Porta do AuthenticationService.

export type AuthResult = {
  accessToken: string
  refreshToken: string
  user: UserResponse
}

export type UserResponse = Pick<User, "id" | "name" | "email" | "authProvider">

// O MySQL comparava e-mails sem diferenciar maiúsculas (collation *_ci); no SQLite normalizamos.
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

// Contas só-Google não têm senha utilizável: o valor não corresponde a nenhum formato aceito
// por verifyPassword. Evita gastar CPU com hash de uma senha aleatória.
const GOOGLE_ONLY_PASSWORD = "!google-auth-only"

export const toUserResponse = ({ id, name, email, authProvider }: User): UserResponse => ({
  id,
  name,
  email,
  authProvider,
})

const findByEmail = (db: Database, email: string) =>
  db.query.users.findFirst({ where: eq(users.email, normalizeEmail(email)) })

async function buildAuthResult(env: Env, user: User): Promise<AuthResult> {
  const [accessToken, refreshToken] = await Promise.all([
    signToken(env, "access", user.email),
    signToken(env, "refresh", user.email),
  ])
  return { accessToken, refreshToken, user: toUserResponse(user) }
}

export async function register(
  env: Env,
  db: Database,
  input: { name: string; email: string; password: string },
): Promise<AuthResult> {
  const email = normalizeEmail(input.email)
  if (await findByEmail(db, email)) {
    throw new ApiError(409, "Conflito", "E-mail já cadastrado")
  }

  const [user] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email,
      name: input.name.trim(),
      password: await hashPassword(input.password),
      authProvider: "LOCAL",
    })
    .returning()

  return buildAuthResult(env, user!)
}

export async function login(
  env: Env,
  db: Database,
  input: { email: string; password: string },
): Promise<AuthResult> {
  const user = await findByEmail(db, input.email)
  if (user?.authProvider === "GOOGLE") {
    throw unauthorized("Esta conta utiliza login exclusivo com Google")
  }
  if (!user || !(await verifyPassword(input.password, user.password))) {
    throw unauthorized("Usuário ou senha inválidos")
  }

  // Migração gradual: hash BCrypt legado (ou PBKDF2 com parâmetros antigos) é regravado.
  if (needsRehash(user.password)) {
    await db
      .update(users)
      .set({ password: await hashPassword(input.password) })
      .where(eq(users.id, user.id))
  }

  return buildAuthResult(env, user)
}

export async function refresh(env: Env, db: Database, refreshToken: string | undefined): Promise<AuthResult> {
  const email = refreshToken ? await verifyToken(env, "refresh", refreshToken) : null
  const user = email ? await findByEmail(db, email) : undefined
  if (!user) {
    throw unauthorized("Refresh token invalido")
  }
  return buildAuthResult(env, user)
}

export async function loginWithGoogle(env: Env, db: Database, profile: GoogleUserProfile): Promise<AuthResult> {
  const email = normalizeEmail(profile.email)
  const googleFields = {
    authProvider: "GOOGLE" as const,
    googleSubject: profile.subject,
    emailVerified: profile.emailVerified,
  }

  const bySubject = await db.query.users.findFirst({ where: eq(users.googleSubject, profile.subject) })
  if (bySubject) {
    if (bySubject.email !== email) {
      throw unauthorized("Conta Google vinculada a outro usuario")
    }
    const [updated] = await db
      .update(users)
      .set({ ...googleFields, ...(!bySubject.name?.trim() && { name: profile.name }) })
      .where(eq(users.id, bySubject.id))
      .returning()
    return buildAuthResult(env, updated!)
  }

  const byEmail = await findByEmail(db, email)
  if (byEmail) {
    if (byEmail.googleSubject && byEmail.googleSubject !== profile.subject) {
      throw unauthorized("Conta Google vinculada a outro usuario")
    }
    const [linked] = await db
      .update(users)
      .set({ ...googleFields, ...(profile.name?.trim() && { name: profile.name }) })
      .where(eq(users.id, byEmail.id))
      .returning()
    return buildAuthResult(env, linked!)
  }

  const [created] = await db
    .insert(users)
    .values({ id: crypto.randomUUID(), email, name: profile.name, password: GOOGLE_ONLY_PASSWORD, ...googleFields })
    .returning()
  return buildAuthResult(env, created!)
}
