import { describe, expect, it } from "vitest"
import { addPartner, as, createPlan, createUser, json, type TestUser } from "./helpers.ts"

async function createCard(user: TestUser, owner: TestUser = user, name = "Nubank") {
  return json<{ id: string }>(as(user).post("/credit-cards", { name, userId: owner.id }), 201)
}

const tx = (planId: string, referenceDate: string, extra: Record<string, unknown> = {}) => ({
  planId,
  description: "Compra",
  amount: 10,
  type: "EXPENSE",
  referenceDate,
  ...extra,
})

describe("categorias", () => {
  it("cria, impede duplicado ignorando maiúsculas e lista em ordem", async () => {
    const user = await createUser()
    const suffix = crypto.randomUUID().slice(0, 8)
    await json(as(user).post("/transaction-categories", { name: `Zeta ${suffix}` }), 201)
    await json(as(user).post("/transaction-categories", { name: `Alfa ${suffix}` }), 201)

    expect(await json(as(user).post("/transaction-categories", { name: `ALFA ${suffix}` }), 400)).toMatchObject({
      detail: "Já existe uma categoria com este nome",
    })

    const list = await json(as(user).get("/transaction-categories"))
    const names = list._embedded.transactionCategories.map((c: any) => c.name).filter((n: string) => n.endsWith(suffix))
    expect(names).toEqual([`Alfa ${suffix}`, `Zeta ${suffix}`])
  })

  it("transação reaproveita categoria pelo nome e excluir a categoria só descategoriza", async () => {
    const user = await createUser()
    const plan = await createPlan(user)
    const name = `Mercado ${crypto.randomUUID().slice(0, 8)}`

    const first = await json(as(user).post("/transactions", tx(plan.id, "2026-10-01", { category: { name } })), 201)
    const second = await json(
      as(user).post("/transactions", tx(plan.id, "2026-10-02", { category: { name: name.toUpperCase() } })),
      201,
    )
    expect(second.category.id).toBe(first.category.id)

    expect((await as(user).delete(`/transaction-categories/${first.category.id}`)).status).toBe(204)
    expect(await json(as(user).get(`/transactions/${first.id}`))).toMatchObject({ category: null })
  })
})

describe("cartões", () => {
  it("parceiro vê cartões do plano; estranho não acessa nem cria cartão para outro", async () => {
    const owner = await createUser()
    const partner = await createUser()
    const stranger = await createUser()
    const plan = await createPlan(owner)
    await addPartner(owner, plan.id, partner)

    const ownerCard = await createCard(owner)
    const partnerCard = await createCard(owner, partner, "Inter") // owner cadastra cartão do parceiro
    await createCard(stranger)

    const planCards = await json(as(partner).get(`/plans/${plan.id}/credit-cards`))
    expect(planCards._embedded.creditCards.map((c: any) => c.id).sort()).toEqual([ownerCard.id, partnerCard.id].sort())

    expect((await as(stranger).get(`/credit-cards/${ownerCard.id}`)).status).toBe(404)
    expect((await as(stranger).post("/credit-cards", { name: "X", userId: owner.id })).status).toBe(403)

    const mine = await json(as(partner).get("/users/me/credit-cards"))
    expect(mine._embedded.creditCards.map((c: any) => c.id)).toEqual([partnerCard.id])
  })

  it("não exclui cartão com faturas", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const card = await createCard(owner)
    await json(
      as(owner).post("/credit-card-invoices", { planId: plan.id, creditCardId: card.id, referenceMonth: "2026-10", amount: 50 }),
      201,
    )
    expect((await as(owner).delete(`/credit-cards/${card.id}`)).status).toBe(409)
  })
})

describe("faturas", () => {
  it("cria com mês de referência, impede duplicada e lista por mês", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const card = await createCard(owner)
    const body = { planId: plan.id, creditCardId: card.id, referenceMonth: "2026-10", amount: 1234.56 }

    const res = await as(owner).post("/credit-card-invoices", body)
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ referenceMonth: "2026-10", amount: 1234.56, creditCardName: "Nubank" })

    expect((await as(owner).post("/credit-card-invoices", body)).status).toBe(409)
    // Mesmo cartão e mês em outro ano é outra fatura.
    await json(as(owner).post("/credit-card-invoices", { ...body, referenceMonth: "2027-10" }), 201)

    const october = await json(as(owner).get(`/plans/${plan.id}/invoices?month=2026-10`))
    expect(october._embedded.invoices.map((i: any) => i.referenceMonth)).toEqual(["2026-10"])
    const all = await json(as(owner).get(`/plans/${plan.id}/invoices`))
    expect(all._embedded.invoices).toHaveLength(2)
  })

  it("recusa cartão de quem não participa do plano e mês inválido", async () => {
    const owner = await createUser()
    const stranger = await createUser()
    const plan = await createPlan(owner)
    const strangerCard = await createCard(stranger)

    expect(
      await json(
        as(owner).post("/credit-card-invoices", {
          planId: plan.id,
          creditCardId: strangerCard.id,
          referenceMonth: "2026-10",
          amount: 10,
        }),
        400,
      ),
    ).toMatchObject({ detail: "O cartão precisa pertencer a um participante do plano." })

    const card = await createCard(owner)
    expect(
      await json(
        as(owner).post("/credit-card-invoices", { planId: plan.id, creditCardId: card.id, referenceMonth: "2026-13", amount: 10 }),
        400,
      ),
    ).toMatchObject({ errors: { referenceMonth: "Mês inválido (use AAAA-MM)" } })
  })

  it("mudar o mês da fatura leva as transações junto, limitando o dia e indo para o fim da ordem", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const card = await createCard(owner)
    const invoice = await json(
      as(owner).post("/credit-card-invoices", { planId: plan.id, creditCardId: card.id, referenceMonth: "2026-01", amount: 100 }),
      201,
    )

    const linked = await json(
      as(owner).post("/transactions", tx(plan.id, "2026-01-31", { creditCardInvoiceId: invoice.id })),
      201,
    )
    const februaryExisting = await json(as(owner).post("/transactions", tx(plan.id, "2026-02-10")), 201)
    expect(februaryExisting.order).toBe(1)

    await json(
      as(owner).put(`/credit-card-invoices/${invoice.id}`, { creditCardId: card.id, referenceMonth: "2026-02", amount: 100 }),
    )

    const moved = await json(as(owner).get(`/transactions/${linked.id}`))
    expect(moved).toMatchObject({ referenceDate: "2026-02-28", order: 2 })
  })

  it("excluir a fatura desvincula as transações", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const card = await createCard(owner)
    const invoice = await json(
      as(owner).post("/credit-card-invoices", { planId: plan.id, creditCardId: card.id, referenceMonth: "2026-03", amount: 100 }),
      201,
    )
    const linked = await json(as(owner).post("/transactions", tx(plan.id, "2026-03-05", { creditCardInvoiceId: invoice.id })), 201)

    expect((await as(owner).delete(`/credit-card-invoices/${invoice.id}`)).status).toBe(204)
    expect(await json(as(owner).get(`/transactions/${linked.id}`))).toMatchObject({
      creditCardInvoiceId: null,
      referenceDate: "2026-03-05",
    })
  })
})
