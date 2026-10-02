import { env } from "cloudflare:test"
import { describe, expect, it } from "vitest"

const id = () => crypto.randomUUID()

async function seedPlan() {
  const userId = id()
  const planId = id()
  await env.DB.batch([
    env.DB.prepare("insert into users (id, email, password) values (?, ?, 'x')").bind(userId, `${userId}@t.dev`),
    env.DB.prepare("insert into financial_plans (id, owner_id, name) values (?, ?, 'Casa')").bind(planId, userId),
  ])
  return { userId, planId }
}

const insertTx = (planId: string, referenceDate: string, amountCents: number, type = "EXPENSE") =>
  env.DB.prepare(
    `insert into transactions (id, plan_id, amount_cents, type, reference_date, created_at)
     values (?, ?, ?, ?, ?, '2026-01-01T00:00:00.000Z')`,
  ).bind(id(), planId, amountCents, type, referenceDate)

describe("schema D1", () => {
  it("filtra transações por intervalo de datas usando o índice (plan_id, reference_date)", async () => {
    const { planId } = await seedPlan()
    await env.DB.batch([
      insertTx(planId, "2026-01-15", 1000),
      insertTx(planId, "2026-02-10", 2000),
      insertTx(planId, "2026-03-05", 3000, "REVENUE"),
    ])

    const row = await env.DB.prepare(
      `select sum(case when type = 'EXPENSE' then amount_cents else 0 end) as expense
       from transactions where plan_id = ? and reference_date between ? and ?`,
    )
      .bind(planId, "2026-01-01", "2026-02-28")
      .first<{ expense: number }>()
    expect(row?.expense).toBe(3000)

    const plan = await env.DB.prepare(
      "explain query plan select * from transactions where plan_id = ? and reference_date between ? and ?",
    )
      .bind(planId, "2026-01-01", "2026-02-28")
      .all<{ detail: string }>()
    expect(plan.results.map((r) => r.detail).join(" ")).toContain("idx_transactions_plan_reference_date")
  })

  it("rejeita tipo inválido e exige plano existente", async () => {
    const { planId } = await seedPlan()
    await expect(insertTx(planId, "2026-01-01", 10, "OTHER").run()).rejects.toThrow(/CHECK/)
    await expect(insertTx(id(), "2026-01-01", 10).run()).rejects.toThrow(/FOREIGN KEY/)
  })

  it("impede duas faturas do mesmo cartão no mesmo mês e plano", async () => {
    const { userId, planId } = await seedPlan()
    const cardId = id()
    await env.DB.prepare("insert into credit_cards (id, user_id, name) values (?, ?, 'Nubank')").bind(cardId, userId).run()
    const invoice = () =>
      env.DB.prepare(
        "insert into credit_card_invoices (id, plan_id, credit_card_id, reference_month) values (?, ?, ?, '2026-10')",
      ).bind(id(), planId, cardId)

    await invoice().run()
    await expect(invoice().run()).rejects.toThrow(/UNIQUE/)
  })

  it("apagar o plano remove transações e faturas em cascata", async () => {
    const { planId } = await seedPlan()
    await insertTx(planId, "2026-01-01", 10).run()
    await env.DB.prepare("delete from financial_plans where id = ?").bind(planId).run()
    const count = await env.DB.prepare("select count(*) as n from transactions where plan_id = ?")
      .bind(planId)
      .first<{ n: number }>()
    expect(count?.n).toBe(0)
  })
})
