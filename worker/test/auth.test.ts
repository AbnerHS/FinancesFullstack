import bcrypt from "bcryptjs"
import { env } from "cloudflare:test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { signToken } from "../src/lib/jwt.ts"
import { hashPassword } from "../src/lib/password.ts"
import { api, postJson, refreshCookie } from "./helpers.ts"

const uniqueEmail = () => `${crypto.randomUUID()}@example.com`

async function getUser(email: string) {
  return env.DB.prepare("select * from users where email = ?").bind(email).first<{
    id: string
    password: string
    name: string | null
    auth_provider: string
    google_subject: string | null
    email_verified: number
  }>()
}

describe("POST /api/auth/register", () => {
  it("cria usuário, devolve access token e grava refresh em cookie HttpOnly", async () => {
    const email = uniqueEmail()
    const res = await postJson("/auth/register", { name: "Ana", email, password: "segredo1" })

    expect(res.status).toBe(200)
    const body = await res.json<{ accessToken: string; user: Record<string, unknown> }>()
    expect(body.accessToken).toEqual(expect.any(String))
    expect(body).not.toHaveProperty("refreshToken")
    expect(body.user).toEqual({ id: expect.any(String), name: "Ana", email, authProvider: "LOCAL" })

    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("refresh_token="))!
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Path=/api/auth")
    expect(cookie).toContain("SameSite=Lax")

    expect((await getUser(email))?.password).toMatch(/^pbkdf2_sha256\$20000\$/)
  })

  it("normaliza o e-mail e recusa duplicado com 409", async () => {
    const email = uniqueEmail()
    await postJson("/auth/register", { name: "Ana", email: `  ${email.toUpperCase()} `, password: "segredo1" })
    expect(await getUser(email)).not.toBeNull()

    const res = await postJson("/auth/register", { name: "Outra", email, password: "segredo2" })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ detail: "E-mail já cadastrado" })
  })

  it("valida campos no formato do Spring (errors por campo)", async () => {
    const res = await postJson("/auth/register", { name: "", email: "invalido", password: "123" })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      title: "Erro de validação",
      errors: {
        name: "O nome é obrigatório.",
        email: "Informe um e-mail válido.",
        password: "Use pelo menos 6 caracteres.",
      },
    })
  })
})

describe("POST /api/auth/login", () => {
  it("autentica com e-mail em qualquer caixa", async () => {
    const email = uniqueEmail()
    await postJson("/auth/register", { name: "Bia", email, password: "segredo1" })

    const res = await postJson("/auth/login", { email: email.toUpperCase(), password: "segredo1" })
    expect(res.status).toBe(200)
    expect(refreshCookie(res)).not.toBeNull()
  })

  it("recusa senha errada e usuário inexistente com a mesma mensagem", async () => {
    const email = uniqueEmail()
    await postJson("/auth/register", { name: "Bia", email, password: "segredo1" })

    for (const payload of [
      { email, password: "errada" },
      { email: uniqueEmail(), password: "segredo1" },
    ]) {
      const res = await postJson("/auth/login", payload)
      expect(res.status).toBe(401)
      expect(await res.json()).toMatchObject({ detail: "Usuário ou senha inválidos" })
    }
  })

  it("aceita hash BCrypt do Spring e regrava em PBKDF2", async () => {
    const email = uniqueEmail()
    const legacy = bcrypt.hashSync("senha-antiga", 4).replace(/^\$2b\$/, "$2a$")
    await env.DB.prepare("insert into users (id, email, password, name) values (?, ?, ?, 'Legado')")
      .bind(crypto.randomUUID(), email, legacy)
      .run()

    const res = await postJson("/auth/login", { email, password: "senha-antiga" })
    expect(res.status).toBe(200)
    expect((await getUser(email))?.password).toMatch(/^pbkdf2_sha256\$20000\$/)

    const again = await postJson("/auth/login", { email, password: "senha-antiga" })
    expect(again.status).toBe(200)
  })

  it("bloqueia login por senha em conta Google", async () => {
    const email = uniqueEmail()
    await env.DB.prepare(
      "insert into users (id, email, password, auth_provider) values (?, ?, '!google-auth-only', 'GOOGLE')",
    )
      .bind(crypto.randomUUID(), email)
      .run()

    const res = await postJson("/auth/login", { email, password: "qualquer" })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ detail: "Esta conta utiliza login exclusivo com Google" })
  })

  it("regrava hash PBKDF2 com iterações antigas no login", async () => {
    const email = uniqueEmail()
    const old = await hashPassword("segredo1", 1_000)
    await env.DB.prepare("insert into users (id, email, password, name) values (?, ?, ?, 'Antigo')")
      .bind(crypto.randomUUID(), email, old)
      .run()

    expect((await postJson("/auth/login", { email, password: "segredo1" })).status).toBe(200)
    expect((await getUser(email))?.password).toMatch(/^pbkdf2_sha256\$20000\$/)
  })
})

describe("POST /api/auth/refresh e /logout", () => {
  it("troca o cookie de refresh por novo access token utilizável", async () => {
    const email = uniqueEmail()
    const registered = await postJson("/auth/register", { name: "Caio", email, password: "segredo1" })

    const res = await postJson("/auth/refresh", {}, { Cookie: refreshCookie(registered)! })
    expect(res.status).toBe(200)
    const { accessToken } = await res.json<{ accessToken: string }>()
    expect(refreshCookie(res)).not.toBeNull()

    const me = await api("/users/me", { headers: { Authorization: `Bearer ${accessToken}` } })
    expect(me.status).toBe(200)
    expect(await me.json()).toMatchObject({ email })
  })

  it("recusa refresh sem cookie, com access token no lugar ou de usuário inexistente", async () => {
    const access = await signToken(env, "access", "ninguem@example.com")
    const orphan = await signToken(env, "refresh", "ninguem@example.com")

    const cases: Record<string, string>[] = [{}, { Cookie: `refresh_token=${access}` }, { Cookie: `refresh_token=${orphan}` }]
    for (const headers of cases) {
      const res = await postJson("/auth/refresh", {}, headers)
      expect(res.status).toBe(401)
      expect(await res.json()).toMatchObject({ detail: "Refresh token invalido" })
    }
  })

  it("logout expira o cookie de refresh", async () => {
    const res = await postJson("/auth/logout", {})
    expect(res.status).toBe(204)
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("refresh_token="))!
    expect(cookie).toMatch(/Max-Age=0/)
    expect(cookie).toContain("Path=/api/auth")
  })
})

describe("POST /api/auth/google", () => {
  afterEach(() => vi.restoreAllMocks())

  function mockGoogle(profile: Record<string, unknown>, tokenStatus = 200) {
    const calls: { url: string; body: string; authorization: string | null }[] = []
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const request = new Request(input, init)
      calls.push({
        url: request.url,
        body: new TextDecoder().decode(await request.arrayBuffer()),
        authorization: request.headers.get("Authorization"),
      })
      if (request.url === "https://google.test/token") {
        return tokenStatus === 200
          ? Response.json({ access_token: "google-access" })
          : new Response("invalid_grant", { status: tokenStatus })
      }
      if (request.url === "https://google.test/userinfo") {
        return Response.json(profile)
      }
      throw new Error(`fetch inesperado: ${request.url}`)
    })
    return calls
  }

  it("cria usuário Google novo e envia o code para o Google", async () => {
    const email = uniqueEmail()
    const calls = mockGoogle({ sub: "g-new", email, name: "Gabi", email_verified: true })

    const res = await postJson("/auth/google", { code: "abc" })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ user: { email, name: "Gabi", authProvider: "GOOGLE" } })

    const tokenBody = new URLSearchParams(calls[0]!.body)
    expect(tokenBody.get("code")).toBe("abc")
    expect(tokenBody.get("grant_type")).toBe("authorization_code")
    expect(calls[1]!.authorization).toBe("Bearer google-access")

    const user = await getUser(email)
    expect(user).toMatchObject({ google_subject: "g-new", email_verified: 1, password: "!google-auth-only" })
  })

  it("vincula conta local existente pelo e-mail", async () => {
    const email = uniqueEmail()
    await postJson("/auth/register", { name: "Local", email, password: "segredo1" })
    mockGoogle({ sub: "g-link", email: email.toUpperCase(), name: "Nome Google", email_verified: true })

    const res = await postJson("/auth/google", { code: "abc" })
    expect(res.status).toBe(200)
    expect(await getUser(email)).toMatchObject({
      auth_provider: "GOOGLE",
      google_subject: "g-link",
      name: "Nome Google",
    })
  })

  it("recusa quando o subject já pertence a outro e-mail", async () => {
    const email = uniqueEmail()
    mockGoogle({ sub: "g-owner", email, name: "Dono", email_verified: true })
    await postJson("/auth/google", { code: "abc" })

    vi.restoreAllMocks()
    mockGoogle({ sub: "g-owner", email: uniqueEmail(), name: "Outro", email_verified: true })
    const res = await postJson("/auth/google", { code: "abc" })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ detail: "Conta Google vinculada a outro usuario" })
  })

  it("recusa e-mail não verificado e code inválido", async () => {
    mockGoogle({ sub: "g-x", email: uniqueEmail(), email_verified: false })
    expect((await postJson("/auth/google", { code: "abc" })).status).toBe(401)

    vi.restoreAllMocks()
    mockGoogle({}, 400)
    const res = await postJson("/auth/google", { code: "abc" })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ detail: "Credenciais do Google invalidas" })
  })
})
