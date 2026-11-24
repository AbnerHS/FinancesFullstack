import { describe, expect, it } from "vitest"
import { addMonthsToYearMonth, currentYearMonth } from "../src/lib/dates.ts"
import { addPartner, as, createPlan, createUser, json, type TestUser } from "./helpers.ts"

// Os meses são relativos ao mês atual: a geração depende de "hoje".
const now = currentYearMonth()
const month = (offset: number) => addMonthsToYearMonth(now, offset)

async function monthData(user: TestUser, planId: string, from: string, to: string) {
  const data = await json<{ months: Array<{ month: string; transactions: any[] }> }>(
    as(user).get(`/plans/${planId}/month-data?from=${from}&to=${to}`),
  )
  return data.months
}

const chargesOf = (months: Array<{ month: string; transactions: any[] }>, subscriptionId: string) =>
  months.flatMap((m) => m.transactions.filter((t) => t.subscriptionId === subscriptionId))

async function setup(extra: Record<string, unknown> = {}) {
  const owner = await createUser()
  const plan = await createPlan(owner)
  const subscription = await json(
    as(owner).post(`/plans/${plan.id}/subscriptions`, {
      name: "Streaming",
      amount: 39.9,
      billingDay: 31,
      chargeMode: "BILL",
      startMonth: month(-2),
      category: { name: "Entretenimento" },
      ...extra,
    }),
    201,
  )
  return { owner, plan, subscription }
}

describe("assinaturas", () => {
  it("gera as cobranças do início até o mês consultado, sem duplicar", async () => {
    const { owner, plan, subscription } = await setup()
    expect(subscription).toMatchObject({ name: "Streaming", amount: 39.9, active: true, billingDay: 31 })

    // Criar já gera até o mês atual: 3 cobranças (-2, -1, 0).
    let months = await monthData(owner, plan.id, month(-3), month(2))
    expect(chargesOf(months, subscription.id).map((t) => t.referenceDate.slice(0, 7))).toEqual([
      month(-2),
      month(-1),
      month(0),
      month(1),
      month(2),
    ])

    // Consultar de novo não duplica.
    months = await monthData(owner, plan.id, month(-3), month(2))
    expect(chargesOf(months, subscription.id)).toHaveLength(5)

    const charge = chargesOf(months, subscription.id)[0]
    expect(charge).toMatchObject({
      description: "Streaming",
      amount: 39.9,
      type: "EXPENSE",
      paymentStatus: "PENDING",
      category: { name: "Entretenimento" },
    })
    // Dia 31 limitado ao fim do mês; modo BILL vence no dia da cobrança.
    expect(charge.dueDate).toBe(charge.referenceDate)
  })

  it("débito automático não gera vencimento e o horizonte limita a geração", async () => {
    const { owner, plan, subscription } = await setup({ chargeMode: "AUTO", startMonth: month(10) })
    const months = await monthData(owner, plan.id, month(10), month(20))
    const charges = chargesOf(months, subscription.id)
    // Horizonte de 12 meses à frente: meses 10, 11 e 12.
    expect(charges.map((t) => t.referenceDate.slice(0, 7))).toEqual([month(10), month(11), month(12)])
    expect(charges.every((t) => t.dueDate === null)).toBe(true)
  })

  it("cobrança apagada (mês pulado) não volta", async () => {
    const { owner, plan, subscription } = await setup()
    const months = await monthData(owner, plan.id, month(0), month(0))
    const [current] = chargesOf(months, subscription.id)
    expect((await as(owner).delete(`/transactions/${current.id}`)).status).toBe(204)

    const again = await monthData(owner, plan.id, month(0), month(1))
    expect(chargesOf(again, subscription.id).map((t) => t.referenceDate.slice(0, 7))).toEqual([month(1)])
  })

  it("mudar o valor atualiza só as cobranças pendentes a partir do mês atual", async () => {
    const { owner, plan, subscription } = await setup()
    let months = await monthData(owner, plan.id, month(-2), month(1))
    const byMonth = (list: any[], m: string) => list.find((t) => t.referenceDate.startsWith(m))
    const paidNext = byMonth(chargesOf(months, subscription.id), month(1))
    await json(as(owner).patch(`/transactions/${paidNext.id}`, { paymentStatus: "PAID", paymentDate: `${now}-01` }))

    await json(as(owner).patch(`/subscriptions/${subscription.id}`, { amount: 44.9, billingDay: 10, name: "Streaming HD" }))

    months = await monthData(owner, plan.id, month(-2), month(1))
    const charges = chargesOf(months, subscription.id)
    expect(byMonth(charges, month(-1))).toMatchObject({ amount: 39.9, description: "Streaming" })
    expect(byMonth(charges, month(0))).toMatchObject({
      amount: 44.9,
      description: "Streaming HD",
      referenceDate: `${month(0)}-10`,
      dueDate: `${month(0)}-10`,
    })
    // A paga fica como estava.
    expect(byMonth(charges, month(1))).toMatchObject({ amount: 39.9, paymentStatus: "PAID" })
  })

  it("encerrar apaga as pendentes depois do fim; reativar volta a gerar a partir do mês atual", async () => {
    const { owner, plan, subscription } = await setup()
    await monthData(owner, plan.id, month(-2), month(3))

    const ended = await json(as(owner).patch(`/subscriptions/${subscription.id}`, { endMonth: month(-1) }))
    expect(ended).toMatchObject({ endMonth: month(-1), active: false })
    let months = await monthData(owner, plan.id, month(-2), month(3))
    expect(chargesOf(months, subscription.id).map((t) => t.referenceDate.slice(0, 7))).toEqual([month(-2), month(-1)])

    await json(as(owner).patch(`/subscriptions/${subscription.id}`, { endMonth: null }))
    months = await monthData(owner, plan.id, month(-2), month(1))
    expect(chargesOf(months, subscription.id).map((t) => t.referenceDate.slice(0, 7))).toEqual([
      month(-2),
      month(-1),
      month(0),
      month(1),
    ])
  })

  it("excluir mantém o histórico e apaga as pendentes a partir do mês atual", async () => {
    const { owner, plan, subscription } = await setup()
    const before = await monthData(owner, plan.id, month(-2), month(1))
    const pastId = chargesOf(before, subscription.id)[0].id

    expect((await as(owner).delete(`/subscriptions/${subscription.id}`)).status).toBe(204)
    const after = await monthData(owner, plan.id, month(-2), month(1))
    const all = after.flatMap((m) => m.transactions)
    expect(all.map((t) => t.referenceDate.slice(0, 7))).toEqual([month(-2), month(-1)])
    expect(all.find((t) => t.id === pastId)).toMatchObject({ subscriptionId: null })
    expect((await as(owner).get(`/subscriptions/${subscription.id}`)).status).toBe(404)
  })

  it("no cartão: vence no dia definido e só entra na fatura do mês no dia do vencimento", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const card = await json(as(owner).post("/credit-cards", { name: "Nubank", userId: owner.id }), 201)
    const invoiceOf = (m: string) =>
      json(as(owner).post("/credit-card-invoices", { planId: plan.id, creditCardId: card.id, referenceMonth: m, amount: 300 }), 201)
    const [previous, next] = [await invoiceOf(month(-1)), await invoiceOf(month(1))]
    const subscription = await json(
      as(owner).post(`/plans/${plan.id}/subscriptions`, {
        name: "Spotify",
        amount: 21.9,
        billingDay: 8,
        chargeMode: "BILL",
        creditCardId: card.id,
        startMonth: month(-1),
      }),
      201,
    )
    expect(subscription).toMatchObject({ creditCardId: card.id })

    let charges = chargesOf(await monthData(owner, plan.id, month(-1), month(2)), subscription.id)
    // Vencimento é o dia definido; o mês passado já venceu e entrou na fatura; os futuros não.
    expect(charges.map((t) => [t.referenceDate.slice(0, 7), t.dueDate, t.creditCardInvoiceId])).toEqual([
      [month(-1), `${month(-1)}-08`, previous.id],
      [month(0), `${month(0)}-08`, null],
      [month(1), `${month(1)}-08`, null],
      [month(2), `${month(2)}-08`, null],
    ])
    expect(charges[0].isClearedByInvoice).toBe(true)
    // Sem fatura do mês atual, a cobrança atual fica sem fatura; a futura, que tem fatura, espera vencer.
    expect(charges[2]).toMatchObject({ isClearedByInvoice: false })

    // Fatura criada depois só recebe cobranças já vencidas.
    await invoiceOf(month(2))
    charges = chargesOf(await monthData(owner, plan.id, month(1), month(2)), subscription.id)
    expect(charges.map((t) => t.creditCardInvoiceId)).toEqual([null, null])
    expect(next.id).not.toBe(charges[0].creditCardInvoiceId)

    // Tirar o cartão: as cobranças em aberto (do mês atual em diante) não entram mais em fatura.
    await json(as(owner).patch(`/subscriptions/${subscription.id}`, { creditCardId: null }))
    charges = chargesOf(await monthData(owner, plan.id, month(0), month(2)), subscription.id)
    expect(charges.every((t) => t.creditCardInvoiceId === null)).toBe(true)

    const stranger = await createUser()
    const strangerCard = await json(as(stranger).post("/credit-cards", { name: "Outro", userId: stranger.id }), 201)
    expect(
      (await as(owner).patch(`/subscriptions/${subscription.id}`, { creditCardId: strangerCard.id })).status,
    ).toBe(400)
  })

  it("valida responsável, acesso ao plano e datas", async () => {
    const { owner, plan, subscription } = await setup()
    const stranger = await createUser()
    expect((await as(stranger).get(`/subscriptions/${subscription.id}`)).status).toBe(403)
    expect((await as(stranger).get(`/plans/${plan.id}/subscriptions`)).status).toBe(403)

    expect(
      (await as(owner).patch(`/subscriptions/${subscription.id}`, { responsibleUserId: stranger.id })).status,
    ).toBe(400)
    const partner = await createUser()
    await addPartner(owner, plan.id, partner)
    expect(
      await json(as(owner).patch(`/subscriptions/${subscription.id}`, { responsibleUserId: partner.id })),
    ).toMatchObject({ responsibleUserId: partner.id })

    expect(
      (await as(owner).patch(`/subscriptions/${subscription.id}`, { endMonth: month(-5) })).status,
    ).toBe(400)

    const list = await json(as(partner).get(`/plans/${plan.id}/subscriptions`))
    expect(list._embedded.subscriptions).toHaveLength(1)
  })
})
