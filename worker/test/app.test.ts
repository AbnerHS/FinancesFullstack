import { env } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { signToken } from "../src/lib/jwt.ts"
import { api } from "./helpers.ts"

async function insertUser(email: string) {
  await env.DB.prepare("insert into users (id, email, password, name) values (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), email, "x", "Teste")
    .run()
}

describe("app", () => {
  it("responde /api/health sem autenticação", async () => {
    const res = await api("/health")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "UP" })
  })

  it("retorna 401 em ProblemDetail sem token", async () => {
    const res = await api("/users/me")
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ status: 401, title: "Credenciais inválidas" })
  })

  it("retorna 401 com token inválido", async () => {
    const res = await api("/users/me", { headers: { Authorization: "Bearer abc" } })
    expect(res.status).toBe(401)
  })

  it("autentica com access token válido", async () => {
    await insertUser("carla@example.com")
    const token = await signToken(env, "access", "carla@example.com")
    const res = await api("/users/me", { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ email: "carla@example.com", authProvider: "LOCAL" })
  })

  it("rejeita refresh token usado como access token", async () => {
    await insertUser("davi@example.com")
    const token = await signToken(env, "refresh", "davi@example.com")
    const res = await api("/users/me", { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(401)
  })
})
