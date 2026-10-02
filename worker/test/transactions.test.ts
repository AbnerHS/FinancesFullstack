import { describe, expect, it } from "vitest"
import { addPartner, as, createPlan, createUser, json, type TestUser } from "./helpers.ts"

const tx = (planId: string, referenceDate: string, extra: Record<string, unknown> = {}) => ({
  planId,
  description: "Conta",
  amount: 10,
  type: "EXPENSE",
  referenceDate,
  ...extra,
})

async function setup() {
  const owner = await createUser("Owner")
  const plan = await createPlan(owner)
  const create = (referenceDate: string, extra: Record<string, unknown> = {}) =>
    json(as(owner).post("/transactions", tx(plan.id, referenceDate, extra)), 201)
  return { owner, plan, create }
}

async function invoiceFor(owner: TestUser, planId: string, referenceMonth: string) {
  const card = await json(as(owner).post("/credit-cards", { name: "Cartão", userId: owner.id }), 201)
  return json(as(owner).post("/credit-card-invoices", { planId, creditCardId: card.id, referenceMonth, amount: 1 }), 201)
}

describe("criação", () => {
  it("devolve valores numéricos e datas ISO, com ordem por mês", async () => {
    const { plan, create } = await setup()
    const first = await create("2026-10-05", { amount: 1234.5, description: "  Aluguel  " })

    expect(first).toMatchObject({
      planId: plan.id,
      description: "Aluguel",
      amount: 1234.5,
      referenceDate: "2026-10-05",
      type: "EXPENSE",
      paymentStatus: "PENDING",
      isClearedByInvoice: false,
      order: 1,
      category: null,
      billingDocument: null,
    })
    expect(first.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(first).not.toHaveProperty("periodId")

    expect((await create("2026-10-20")).order).toBe(2)
    expect((await create("2026-11-01")).order).toBe(1) // outro mês, ordem recomeça
  })

  it("valida campos obrigatórios e datas", async () => {
    const { owner, plan } = await setup()
    const body = await json(
      as(owner).post("/transactions", { planId: plan.id, description: "", amount: -1, type: "X", referenceDate: "2026-02-30" }),
      400,
    )
    expect(Object.keys(body.errors).sort()).toEqual(["amount", "description", "referenceDate", "type"])
  })

  it("exige responsável participante do plano", async () => {
    const { owner, plan, create } = await setup()
    const partner = await createUser()
    await addPartner(owner, plan.id, partner)

    expect((await create("2026-10-01", { responsibleUserId: partner.id })).responsibleUserId).toBe(partner.id)
    expect(
      await json(
        as(owner).post("/transactions", tx(plan.id, "2026-10-01", { responsibleUserId: (await createUser()).id })),
        400,
      ),
    ).toMatchObject({ detail: "O responsável precisa participar do plano." })
  })

  it("vincular à fatura move a competência para o mês da fatura", async () => {
    const { owner, plan, create } = await setup()
    const invoice = await invoiceFor(owner, plan.id, "2026-02")

    const created = await create("2026-01-31", { creditCardInvoiceId: invoice.id })
    expect(created).toMatchObject({ referenceDate: "2026-02-28", creditCardInvoiceId: invoice.id })
    expect(created._links.invoice.href).toBe(`/api/credit-card-invoices/${invoice.id}`)
  })

  it("recusa fatura de outro plano", async () => {
    const { owner, plan } = await setup()
    const otherPlan = await createPlan(owner, "Outro")
    const invoice = await invoiceFor(owner, otherPlan.id, "2026-02")

    expect(
      await json(as(owner).post("/transactions", tx(plan.id, "2026-02-01", { creditCardInvoiceId: invoice.id })), 400),
    ).toMatchObject({ detail: "A fatura pertence a outro plano." })
  })

  it("documento por link exige vencimento; arquivo vai pelo upload", async () => {
    const { owner, plan, create } = await setup()
    const link = { type: "LINK", url: " https://boleto.example/1 " }

    expect((await as(owner).post("/transactions", tx(plan.id, "2026-10-01", { billingDocument: link }))).status).toBe(400)
    const created = await create("2026-10-01", { billingDocument: link, dueDate: "2026-10-10" })
    expect(created.billingDocument).toMatchObject({ type: "LINK", url: "https://boleto.example/1", downloadUrl: null })

    expect(
      await json(
        as(owner).post("/transactions", tx(plan.id, "2026-10-01", { dueDate: "2026-10-10", billingDocument: { type: "FILE" } })),
        400,
      ),
    ).toMatchObject({ detail: "Documentos do tipo arquivo devem ser enviados pelo endpoint de upload." })
  })
})

describe("recorrência", () => {
  it("cria ocorrências mês a mês em um grupo, só a primeira herda o pagamento", async () => {
    const { owner, plan } = await setup()
    const created = await json(
      as(owner).post("/transactions/recurring", {
        transaction: tx(plan.id, "2026-01-31", {
          dueDate: "2026-02-05",
          paymentStatus: "PAID",
          paymentDate: "2026-02-01",
        }),
        occurrences: 3,
      }),
    )

    expect(created.map((t: any) => t.referenceDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"])
    expect(created.map((t: any) => t.dueDate)).toEqual(["2026-02-05", "2026-03-05", "2026-04-05"])
    expect(created.map((t: any) => t.paymentStatus)).toEqual(["PAID", "PENDING", "PENDING"])
    expect(created.map((t: any) => t.paymentDate)).toEqual(["2026-02-01", null, null])
    expect(new Set(created.map((t: any) => t.recurringGroupId)).size).toBe(1)
    expect(created[0].recurringGroupId).toEqual(expect.any(String))
  })

  it("valida quantidade e não aceita fatura", async () => {
    const { owner, plan } = await setup()
    expect((await as(owner).post("/transactions/recurring", { transaction: tx(plan.id, "2026-01-01"), occurrences: 1 })).status).toBe(400)
    expect((await as(owner).post("/transactions/recurring", { transaction: tx(plan.id, "2026-01-01"), occurrences: 121 })).status).toBe(400)

    const invoice = await invoiceFor(owner, plan.id, "2026-01")
    expect(
      (
        await as(owner).post("/transactions/recurring", {
          transaction: tx(plan.id, "2026-01-01", { creditCardInvoiceId: invoice.id }),
          occurrences: 2,
        })
      ).status,
    ).toBe(400)
  })
})

describe("listagem e ordem", () => {
  it("filtra por mês ou intervalo e exige filtro", async () => {
    const { owner, plan, create } = await setup()
    await create("2026-09-30")
    const a = await create("2026-10-01")
    const b = await create("2026-10-31")
    await create("2026-11-01")

    const october = await json(as(owner).get(`/plans/${plan.id}/transactions?month=2026-10`))
    expect(october._embedded.transactions.map((t: any) => t.id)).toEqual([a.id, b.id])
    expect(october._links.self.href).toBe(`/api/plans/${plan.id}/transactions?month=2026-10`)

    const range = await json(as(owner).get(`/plans/${plan.id}/transactions?from=2026-09-01&to=2026-11-30`))
    expect(range._embedded.transactions).toHaveLength(4)

    expect((await as(owner).get(`/plans/${plan.id}/transactions`)).status).toBe(400)
    expect((await as(owner).get(`/plans/${plan.id}/transactions?from=2026-10-31&to=2026-10-01`)).status).toBe(400)
  })

  it("reordena o mês inteiro de uma vez", async () => {
    const { owner, plan, create } = await setup()
    const a = await create("2026-10-01")
    const b = await create("2026-10-02")
    const c = await create("2026-10-03")
    const other = await create("2026-11-01")

    const reorder = (ids: string[]) =>
      as(owner).put(`/plans/${plan.id}/transactions/order`, { month: "2026-10", transactionIds: ids })

    expect((await reorder([c.id, a.id, b.id])).status).toBe(204)
    const list = await json(as(owner).get(`/plans/${plan.id}/transactions?month=2026-10`))
    expect(list._embedded.transactions.map((t: any) => [t.id, t.order])).toEqual([
      [c.id, 1],
      [a.id, 2],
      [b.id, 3],
    ])

    expect((await reorder([a.id, other.id])).status).toBe(400)
    expect((await reorder([a.id, a.id])).status).toBe(400)
  })
})

describe("atualização", () => {
  it("PATCH muda só os campos enviados; mudar de mês manda para o fim da ordem", async () => {
    const { owner, create } = await setup()
    const moving = await create("2026-10-01", { description: "Original", dueDate: "2026-10-10" })
    await create("2026-11-01")
    await create("2026-11-02")

    const updated = await json(as(owner).patch(`/transactions/${moving.id}`, { referenceDate: "2026-11-15", amount: "99.9" }))
    expect(updated).toMatchObject({
      description: "Original",
      dueDate: "2026-10-10",
      amount: 99.9,
      referenceDate: "2026-11-15",
      order: 3,
    })

    // Mesmo mês: ordem preservada.
    const sameMonth = await json(as(owner).patch(`/transactions/${moving.id}`, { referenceDate: "2026-11-20" }))
    expect(sameMonth.order).toBe(3)
  })

  it("com fatura, não deixa mudar o mês sem desvincular", async () => {
    const { owner, plan, create } = await setup()
    const invoice = await invoiceFor(owner, plan.id, "2026-10")
    const linked = await create("2026-10-10", { creditCardInvoiceId: invoice.id })

    expect((await as(owner).patch(`/transactions/${linked.id}`, { referenceDate: "2026-10-25" })).status).toBe(200)
    expect(await json(as(owner).patch(`/transactions/${linked.id}`, { referenceDate: "2026-11-01" }), 400)).toMatchObject({
      detail: expect.stringContaining("mês da fatura (2026-10)"),
    })

    const unlinked = await json(
      as(owner).patch(`/transactions/${linked.id}`, { creditCardInvoiceId: null, referenceDate: "2026-11-01" }),
    )
    expect(unlinked).toMatchObject({ creditCardInvoiceId: null, referenceDate: "2026-11-01" })

    // Vincular de novo traz de volta para o mês da fatura.
    const relinked = await json(as(owner).patch(`/transactions/${linked.id}`, { creditCardInvoiceId: invoice.id }))
    expect(relinked.referenceDate).toBe("2026-10-01")
  })

  it("PUT substitui os campos opcionais", async () => {
    const { owner, create } = await setup()
    const created = await create("2026-10-01", { dueDate: "2026-10-10", paymentStatus: "PAID" })

    const replaced = await json(
      as(owner).put(`/transactions/${created.id}`, {
        description: "Nova",
        amount: 5,
        type: "REVENUE",
        referenceDate: "2026-10-02",
      }),
    )
    expect(replaced).toMatchObject({ description: "Nova", type: "REVENUE", dueDate: null, paymentStatus: "PENDING" })
  })

  it("exclui", async () => {
    const { owner, create } = await setup()
    const created = await create("2026-10-01")
    expect((await as(owner).delete(`/transactions/${created.id}`)).status).toBe(204)
    expect((await as(owner).get(`/transactions/${created.id}`)).status).toBe(404)
  })
})

describe("agregações", () => {
  it("resumo por intervalo, meses com totais e gastos por categoria", async () => {
    const { owner, plan, create } = await setup()
    const name = `Mercado ${crypto.randomUUID().slice(0, 6)}`
    await create("2026-09-10", { amount: 1000, type: "REVENUE" })
    await create("2026-10-01", { amount: 3000, type: "REVENUE" })
    await create("2026-10-02", { amount: 200.1, category: { name } })
    await create("2026-10-03", { amount: 100.2, category: { name } })
    await create("2026-10-04", { amount: 50 })

    expect(await json(as(owner).get(`/plans/${plan.id}/summary?month=2026-10`))).toEqual({
      totalRevenue: 3000,
      totalExpense: 350.3,
      balance: 2649.7,
    })
    expect(await json(as(owner).get(`/plans/${plan.id}/summary`))).toMatchObject({ totalRevenue: 4000 })

    expect(await json(as(owner).get(`/plans/${plan.id}/months`))).toEqual([
      { month: "2026-09", transactionCount: 1, totalRevenue: 1000, totalExpense: 0, balance: 1000 },
      { month: "2026-10", transactionCount: 4, totalRevenue: 3000, totalExpense: 350.3, balance: 2649.7 },
    ])

    expect(await json(as(owner).get(`/reports/spending-by-category?planId=${plan.id}&month=2026-10`))).toEqual([
      { category: name, totalAmount: 300.3 },
      { category: null, totalAmount: 50 },
    ])
  })
})

describe("acesso", () => {
  it("quem não participa não lê nem altera transações do plano", async () => {
    const { plan, create } = await setup()
    const created = await create("2026-10-01")
    const stranger = await createUser()

    expect((await as(stranger).get(`/transactions/${created.id}`)).status).toBe(403)
    expect((await as(stranger).patch(`/transactions/${created.id}`, { amount: 1 })).status).toBe(403)
    expect((await as(stranger).get(`/plans/${plan.id}/transactions?month=2026-10`)).status).toBe(403)
    expect((await as(stranger).post("/transactions", tx(plan.id, "2026-10-01"))).status).toBe(403)
    expect((await as(stranger).get(`/reports/spending-by-category?planId=${plan.id}`)).status).toBe(403)
  })
})
