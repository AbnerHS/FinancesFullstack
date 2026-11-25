import { describe, expect, it } from "vitest"
import { addPartner, as, createPlan, createUser, json } from "./helpers.ts"

describe("lista de compras", () => {
  it("cadastra em lote, ignora repetidos e lista em ordem alfabética", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const first = await json(
      as(owner).post(`/plans/${plan.id}/shopping-items`, {
        items: [{ name: " Leite " }, { name: "arroz", category: "Mercearia" }, { name: "LEITE" }],
      }),
      201,
    )
    expect(first.created.map((item: { name: string }) => item.name)).toEqual(["Leite", "arroz"])
    expect(first.skipped).toEqual(["LEITE"])
    expect(first.created[0]).toMatchObject({ checked: true, category: null, note: null })

    const second = await json(
      as(owner).post(`/plans/${plan.id}/shopping-items`, { items: [{ name: "leite" }, { name: "Café", checked: false }] }),
      201,
    )
    expect(second.skipped).toEqual(["leite"])
    expect(second.created[0]).toMatchObject({ name: "Café", checked: false })

    const list = await json(as(owner).get(`/plans/${plan.id}/shopping-items`))
    expect(list._embedded.shoppingItems.map((item: { name: string }) => item.name)).toEqual(["arroz", "Café", "Leite"])
  })

  it("marcar grava o valor, limpa a observação e o parceiro também edita", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const partner = await createUser()
    await addPartner(owner, plan.id, partner)
    const { created } = await json(as(owner).post(`/plans/${plan.id}/shopping-items`, { items: [{ name: "Ovos" }, { name: "Pão" }] }), 201)
    const [ovos, pao] = created

    const needed = await json(as(partner).patch(`/shopping-items/${ovos.id}`, { checked: false, note: "2 dúzias" }))
    expect(needed).toMatchObject({ checked: false, note: "2 dúzias", updatedBy: partner.id })
    expect(ovos.updatedBy).toBe(owner.id)
    // Repetir o mesmo valor (dois celulares) não inverte.
    expect((await json(as(owner).patch(`/shopping-items/${ovos.id}`, { checked: false }))).checked).toBe(false)
    expect(await json(as(owner).patch(`/shopping-items/${ovos.id}`, { checked: true }))).toMatchObject({ checked: true, note: null })

    expect((await as(owner).patch(`/shopping-items/${pao.id}`, { name: "ovos" })).status).toBe(409)
    expect(await json(as(owner).patch(`/shopping-items/${pao.id}`, { name: "Pão francês", category: "Padaria" }))).toMatchObject({
      name: "Pão francês",
      category: "Padaria",
    })

    const unchecked = await json(as(owner).post(`/plans/${plan.id}/shopping-items/check-all`, { checked: false }))
    expect(unchecked._embedded.shoppingItems.every((item: { checked: boolean }) => !item.checked)).toBe(true)
    const checked = await json(as(partner).post(`/plans/${plan.id}/shopping-items/check-all`, { checked: true }))
    expect(checked._embedded.shoppingItems.every((item: { checked: boolean }) => item.checked)).toBe(true)

    expect((await as(owner).delete(`/shopping-items/${pao.id}`)).status).toBe(204)
    expect((await json(as(owner).get(`/plans/${plan.id}/shopping-items`)))._embedded.shoppingItems).toHaveLength(1)
  })

  it("só participantes do plano acessam", async () => {
    const owner = await createUser()
    const plan = await createPlan(owner)
    const { created } = await json(as(owner).post(`/plans/${plan.id}/shopping-items`, { items: [{ name: "Sal" }] }), 201)
    const stranger = await createUser()
    expect((await as(stranger).get(`/plans/${plan.id}/shopping-items`)).status).toBe(403)
    expect((await as(stranger).post(`/plans/${plan.id}/shopping-items`, { items: [{ name: "X" }] })).status).toBe(403)
    expect((await as(stranger).patch(`/shopping-items/${created[0].id}`, { checked: false })).status).toBe(403)
    expect((await as(stranger).delete(`/shopping-items/${created[0].id}`)).status).toBe(403)
    expect((await as(owner).post(`/plans/${plan.id}/shopping-items`, { items: [] })).status).toBe(400)
  })
})
