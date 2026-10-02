import { env } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { addPartner, as, createPlan, createUser, json } from "./helpers.ts"

describe("planos", () => {
  it("cria, lista em /users/me/plans e expõe links HAL", async () => {
    const owner = await createUser("Ana")
    const res = await as(owner).post("/plans", { name: "  Casa  " })
    expect(res.status).toBe(201)
    const plan = await res.json<any>()
    expect(res.headers.get("Location")).toBe(`/api/plans/${plan.id}`)
    expect(plan).toMatchObject({ name: "Casa", ownerId: owner.id, partnerIds: [] })
    expect(plan._links.transactions.href).toBe(`/api/plans/${plan.id}/transactions`)
    expect(plan._links).not.toHaveProperty("periods")

    const mine = await json(as(owner).get("/users/me/plans"))
    expect(mine._embedded.plans.map((p: any) => p.id)).toEqual([plan.id])
  })

  it("lista vazia ainda traz _embedded", async () => {
    const user = await createUser()
    expect(await json(as(user).get("/users/me/plans"))).toMatchObject({ _embedded: { plans: [] } })
  })

  it("só participantes acessam e só o owner altera", async () => {
    const owner = await createUser()
    const partner = await createUser()
    const stranger = await createUser()
    const plan = await createPlan(owner)
    await addPartner(owner, plan.id, partner)

    expect((await as(partner).get(`/plans/${plan.id}`)).status).toBe(200)
    expect(await json(as(stranger).get(`/plans/${plan.id}`), 403)).toMatchObject({
      detail: "Você não participa deste plano.",
    })
    expect((await as(partner).put(`/plans/${plan.id}`, { name: "Outro" })).status).toBe(403)
    expect(await json(as(owner).patch(`/plans/${plan.id}`, { name: "Nova casa" }))).toMatchObject({ name: "Nova casa" })
    expect((await as(owner).get(`/plans/${crypto.randomUUID()}`)).status).toBe(404)
  })

  it("excluir o plano remove transações e faturas em cascata", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    await json(
      as(owner).post("/transactions", {
        planId: plan.id,
        description: "Luz",
        amount: 100,
        type: "EXPENSE",
        referenceDate: "2026-10-05",
      }),
      201,
    )

    expect((await as(owner).delete(`/plans/${plan.id}`)).status).toBe(204)
    const row = await env.DB.prepare("select count(*) as n from transactions where plan_id = ?")
      .bind(plan.id)
      .first<{ n: number }>()
    expect(row?.n).toBe(0)
  })
})

describe("convites e participantes", () => {
  it("fluxo completo: gerar link, resolver, aceitar, listar e remover parceiro", async () => {
    const owner = await createUser("Dona")
    const partner = await createUser("Parceiro")
    const plan = await createPlan(owner)

    const link = await json(as(owner).put(`/plans/${plan.id}/invite-link`))
    expect(link).toMatchObject({ planId: plan.id, active: true, inviteToken: expect.stringMatching(/^[0-9a-f]{32}$/) })
    expect((await as(partner).get(`/plans/${plan.id}/invite-link`)).status).toBe(403)

    expect(await json(as(partner).get(`/plans/invitations/${link.inviteToken}`))).toMatchObject({
      planId: plan.id,
      ownerName: "Dona",
      alreadyParticipant: false,
      owner: false,
    })
    expect(await json(as(partner).post(`/plans/invitations/${link.inviteToken}/accept`))).toMatchObject({
      alreadyParticipant: true,
    })
    // Aceitar de novo não duplica.
    await json(as(partner).post(`/plans/invitations/${link.inviteToken}/accept`))

    expect(await json(as(owner).get(`/plans/${plan.id}/participants`))).toEqual([
      { userId: owner.id, name: "Dona", email: owner.email, role: "OWNER" },
      { userId: partner.id, name: "Parceiro", email: partner.email, role: "PARTNER" },
    ])

    expect((await as(owner).delete(`/plans/${plan.id}/participants/${owner.id}`)).status).toBe(400)
    expect((await as(owner).delete(`/plans/${plan.id}/participants/${partner.id}`)).status).toBe(204)
    expect((await as(owner).delete(`/plans/${plan.id}/participants/${partner.id}`)).status).toBe(404)
    expect((await as(partner).get(`/plans/${plan.id}`)).status).toBe(403)

    // Remover parceiro troca o token: o link antigo para de valer.
    expect((await as(partner).get(`/plans/invitations/${link.inviteToken}`)).status).toBe(404)
  })

  it("revogar o link invalida o convite", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const link = await json(as(owner).put(`/plans/${plan.id}/invite-link`))

    expect((await as(owner).delete(`/plans/${plan.id}/invite-link`)).status).toBe(204)
    expect(await json(as(owner).get(`/plans/${plan.id}/invite-link`))).toMatchObject({ active: false, inviteToken: null })
    expect((await as(await createUser()).get(`/plans/invitations/${link.inviteToken}`)).status).toBe(404)
  })
})

describe("usuários", () => {
  it("só enxerga usuários com quem divide plano", async () => {
    const owner = await createUser()
    const partner = await createUser()
    const stranger = await createUser()
    const plan = await createPlan(owner)
    await addPartner(owner, plan.id, partner)

    expect(await json(as(owner).get(`/users/${partner.id}`))).toMatchObject({ id: partner.id })
    expect((await as(owner).get(`/users/${stranger.id}`)).status).toBe(404)
    // GET /users (listar todos) não existe mais.
    expect((await as(owner).get("/users")).status).toBe(404)
  })

  it("atualiza nome e e-mail; e-mail novo gera cookie de refresh", async () => {
    const user = await createUser()
    const other = await createUser()
    const newEmail = `novo-${crypto.randomUUID()}@example.com`

    const res = await as(user).patch("/users/me", { name: "Nome Novo", email: newEmail.toUpperCase() })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ name: "Nome Novo", email: newEmail })
    expect(res.headers.getSetCookie().some((c) => c.startsWith("refresh_token="))).toBe(true)

    expect((await as(other).patch("/users/me", { name: "X", email: newEmail })).status).toBe(409)
  })

  it("troca a senha conferindo a atual", async () => {
    const register = await json(
      as({ id: "", email: "", token: "" }).post("/auth/register", {
        name: "Senha",
        email: `${crypto.randomUUID()}@example.com`,
        password: "antiga1",
      }),
    )
    const user = { id: register.user.id, email: register.user.email, token: register.accessToken }

    expect((await as(user).put("/users/me/password", { currentPassword: "errada", newPassword: "nova123" })).status).toBe(
      401,
    )
    expect((await as(user).put("/users/me/password", { currentPassword: "antiga1", newPassword: "nova123" })).status).toBe(
      204,
    )
    expect((await as(user).post("/auth/login", { email: user.email, password: "nova123" })).status).toBe(200)
  })
})
