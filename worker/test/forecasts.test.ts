import { describe, expect, it } from "vitest"
import { addMonthsToYearMonth, currentYearMonth } from "../src/lib/dates.ts"
import { addPartner, as, createPlan, createUser, json } from "./helpers.ts"

const now = currentYearMonth()
const month = (offset: number) => addMonthsToYearMonth(now, offset)

describe("previsões por categoria", () => {
  it("cria, lista e guarda o valor antigo nos meses anteriores ao ajuste", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const created = await json(
      as(owner).post(`/plans/${plan.id}/forecasts`, {
        category: { name: "Combustível" },
        amount: 250,
        startMonth: month(-2),
      }),
      201,
    )
    expect(created).toMatchObject({
      category: { name: "Combustível" },
      amount: 250,
      startMonth: month(-2),
      endMonth: null,
      dueDay: null,
      amounts: [{ fromMonth: month(-2), amount: 250 }],
    })

    // Ajuste vale do mês atual em diante; os meses anteriores guardam R$ 250.
    const updated = await json(as(owner).patch(`/forecasts/${created.id}`, { amount: 280, dueDay: 15 }))
    expect(updated).toMatchObject({
      amount: 280,
      dueDay: 15,
      amounts: [
        { fromMonth: month(-2), amount: 250 },
        { fromMonth: now, amount: 280 },
      ],
    })
    // Ajustar de novo no mesmo mês substitui o valor do mês.
    expect(
      (await json(as(owner).patch(`/forecasts/${created.id}`, { amount: 300 }))).amounts,
    ).toEqual([
      { fromMonth: month(-2), amount: 250 },
      { fromMonth: now, amount: 300 },
    ])

    const list = await json(as(owner).get(`/plans/${plan.id}/forecasts`))
    expect(list._embedded.forecasts).toHaveLength(1)
  })

  it("previsão futura: o valor ajustado vale desde o início", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const created = await json(
      as(owner).post(`/plans/${plan.id}/forecasts`, { category: { name: "Energia" }, amount: 200, startMonth: month(2) }),
      201,
    )
    const updated = await json(as(owner).patch(`/forecasts/${created.id}`, { amount: 220 }))
    expect(updated.amounts).toEqual([{ fromMonth: month(2), amount: 220 }])
  })

  it("uma previsão por categoria, valida datas, responsável e acesso; excluir remove", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const created = await json(
      as(owner).post(`/plans/${plan.id}/forecasts`, { category: { name: "Mercado" }, amount: 900 }),
      201,
    )
    expect((await as(owner).post(`/plans/${plan.id}/forecasts`, { category: { id: created.category.id }, amount: 1 })).status).toBe(409)
    expect((await as(owner).patch(`/forecasts/${created.id}`, { endMonth: month(-1) })).status).toBe(400)

    const stranger = await createUser()
    expect((await as(stranger).get(`/plans/${plan.id}/forecasts`)).status).toBe(403)
    expect((await as(stranger).patch(`/forecasts/${created.id}`, { amount: 1 })).status).toBe(403)
    expect((await as(owner).patch(`/forecasts/${created.id}`, { responsibleUserId: stranger.id })).status).toBe(400)

    const partner = await createUser()
    await addPartner(owner, plan.id, partner)
    expect(
      await json(as(partner).patch(`/forecasts/${created.id}`, { responsibleUserId: partner.id })),
    ).toMatchObject({ responsibleUserId: partner.id })

    expect((await as(owner).delete(`/forecasts/${created.id}`)).status).toBe(204)
    expect((await json(as(owner).get(`/plans/${plan.id}/forecasts`)))._embedded.forecasts).toEqual([])
  })
})
