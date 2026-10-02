import { env } from "cloudflare:test"
import { exports } from "cloudflare:workers"
import { signToken } from "../src/lib/jwt.ts"

export const api = (path: string, init?: RequestInit) =>
  exports.default.fetch(new Request(`https://finances.test/api${path}`, init))

export const postJson = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })

/** Extrai `refresh_token=...` do Set-Cookie para reenviar como header Cookie. */
export function refreshCookie(res: Response): string | null {
  const header = res.headers.getSetCookie().find((c) => c.startsWith("refresh_token="))
  return header ? header.split(";")[0]! : null
}

// ---------------------------------------------------------------------------------------------
// Cenários do núcleo

export type TestUser = { id: string; email: string; token: string }

/** Cria usuário direto no D1 (sem custo de hash) e devolve um access token válido. */
export async function createUser(name = "Teste"): Promise<TestUser> {
  const id = crypto.randomUUID()
  const email = `${id}@example.com`
  await env.DB.prepare("insert into users (id, email, password, name) values (?, ?, 'x', ?)")
    .bind(id, email, name)
    .run()
  return { id, email, token: await signToken(env, "access", email) }
}

/** Cliente autenticado: `as(user).get("/plans/...")`. */
export function as(user: TestUser) {
  const call = (method: string) => (path: string, body?: unknown) =>
    api(path, {
      method,
      headers: {
        Authorization: `Bearer ${user.token}`,
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  return { get: call("GET"), post: call("POST"), put: call("PUT"), patch: call("PATCH"), delete: call("DELETE") }
}

export async function json<T = any>(res: Response | Promise<Response>, status = 200): Promise<T> {
  const response = await res
  const body = response.status === 204 ? null : await response.json()
  if (response.status !== status) {
    throw new Error(`Esperava ${status}, recebeu ${response.status}: ${JSON.stringify(body)}`)
  }
  return body as T
}

export async function createPlan(owner: TestUser, name = "Casa") {
  return json<{ id: string }>(as(owner).post("/plans", { name }), 201)
}

/** Owner cria o convite e `partner` aceita. */
export async function addPartner(owner: TestUser, planId: string, partner: TestUser) {
  const link = await json<{ inviteToken: string }>(as(owner).put(`/plans/${planId}/invite-link`))
  await json(as(partner).post(`/plans/invitations/${link.inviteToken}/accept`))
}
