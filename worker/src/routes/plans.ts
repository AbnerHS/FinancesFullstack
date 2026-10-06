import { Hono } from "hono"
import { z } from "zod"
import { badRequest } from "../lib/errors.ts"
import { collection } from "../lib/hal.ts"
import { id, parseDateRange, yearMonth } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import { isIsoDate, isYearMonth, monthBounds } from "../lib/dates.ts"
import { paymentStatuses } from "../db/schema.ts"
import { requirePlanAccess, requirePlanOwner } from "../services/access.ts"
import * as cards from "../services/cards.ts"
import * as invoices from "../services/invoices.ts"
import * as plans from "../services/plans.ts"
import * as transactions from "../services/transactions.ts"
import type { AppEnv } from "../types.ts"

const nameSchema = z.object({ name: z.string().trim().min(1, "O nome do plano é obrigatório") })

const reorderSchema = z.object({
  month: yearMonth,
  transactionIds: z.array(id()).max(1000),
})

const selfHref = (url: string) => {
  const { pathname, search } = new URL(url)
  return pathname + search
}

const MONTH_DATA_LIMIT = 24

/** Quantos meses de `from` a `to`, inclusive (AAAA-MM). */
function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number) as [number, number]
  const [ty, tm] = to.split("-").map(Number) as [number, number]
  return (ty - fy) * 12 + (tm - fm) + 1
}

/** Lista AAAA-MM de `from` a `to`, inclusive. */
function monthRange(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number) as [number, number]
  return Array.from({ length: monthsBetween(from, to) }, (_, index) => {
    const date = new Date(Date.UTC(fy, fm - 1 + index, 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
  })
}

/** `month=AAAA-MM` ou `from`/`to` (AAAA-MM), para faturas. */
function parseMonthRange(query: Record<string, string | undefined>) {
  const { month, from, to } = query
  if (month) {
    if (!isYearMonth(month)) throw badRequest("Parâmetro 'month' inválido (use AAAA-MM)")
    return { from: month, to: month }
  }
  if (!from && !to) return null
  if (!from || !to || !isYearMonth(from) || !isYearMonth(to)) {
    throw badRequest("Informe 'from' e 'to' no formato AAAA-MM")
  }
  return { from, to }
}

export const planRoutes = new Hono<AppEnv>()
  .post("/", validate("json", nameSchema), async (c) => {
    const plan = await plans.create(c.var.db, c.var.user, c.req.valid("json").name)
    c.header("Location", `/api/plans/${plan.id}`)
    return c.json(await plans.planModel(c.var.db, plan), 201)
  })
  // Convites antes de /:id para não colidir com o parâmetro.
  .get("/invitations/:token", async (c) =>
    c.json(await plans.resolveInvitation(c.var.db, c.var.user, c.req.param("token"))),
  )
  .post("/invitations/:token/accept", async (c) =>
    c.json(await plans.acceptInvitation(c.var.db, c.var.user, c.req.param("token"))),
  )
  .get("/:id", async (c) => {
    const plan = await requirePlanAccess(c.var.db, c.req.param("id"), c.var.user)
    return c.json(await plans.planModel(c.var.db, plan))
  })
  .put("/:id", validate("json", nameSchema), async (c) => {
    const plan = await plans.rename(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json").name)
    return c.json(await plans.planModel(c.var.db, plan))
  })
  .patch("/:id", validate("json", nameSchema.partial()), async (c) => {
    const { name } = c.req.valid("json")
    const plan =
      name === undefined
        ? await requirePlanOwner(c.var.db, c.req.param("id"), c.var.user)
        : await plans.rename(c.var.db, c.var.user, c.req.param("id"), name)
    return c.json(await plans.planModel(c.var.db, plan))
  })
  .delete("/:id", async (c) => {
    await plans.remove(c.env, c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
  .get("/:id/participants", async (c) => c.json(await plans.participants(c.var.db, c.var.user, c.req.param("id"))))
  .delete("/:id/participants/:userId", async (c) => {
    await plans.removeParticipant(c.var.db, c.var.user, c.req.param("id"), c.req.param("userId"))
    return c.body(null, 204)
  })
  .get("/:id/invite-link", async (c) => c.json(await plans.getInviteLink(c.var.db, c.var.user, c.req.param("id"))))
  .put("/:id/invite-link", async (c) => c.json(await plans.rotateInviteLink(c.var.db, c.var.user, c.req.param("id"))))
  .delete("/:id/invite-link", async (c) => {
    await plans.revokeInviteLink(c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
  .get("/:id/credit-cards", async (c) => {
    const list = await cards.listByPlan(c.var.db, c.var.user, c.req.param("id"))
    return c.json(collection("creditCards", list.map(cards.cardModel), `/api/plans/${c.req.param("id")}/credit-cards`))
  })
  .get("/:id/transactions", async (c) => {
    const query = c.req.query()
    const range = parseDateRange(query)
    const recurringGroupId = query.recurringGroupId || undefined
    const dueFrom = query.dueFrom || undefined
    const dueTo = query.dueTo || undefined
    const paymentStatus = query.paymentStatus || undefined
    for (const [name, value] of [["dueFrom", dueFrom], ["dueTo", dueTo]] as const) {
      if (value && !isIsoDate(value)) throw badRequest(`Parâmetro '${name}' inválido (use AAAA-MM-DD)`)
    }
    if (paymentStatus && !paymentStatuses.includes(paymentStatus as never)) {
      throw badRequest("Parâmetro 'paymentStatus' inválido (PENDING ou PAID)")
    }
    if (!range && !recurringGroupId && !dueFrom && !dueTo) {
      throw badRequest(
        "Informe 'month' (AAAA-MM), 'from' e 'to' (AAAA-MM-DD), 'recurringGroupId' ou 'dueFrom'/'dueTo' (AAAA-MM-DD)",
      )
    }
    const list = await transactions.listByPlan(c.var.db, c.var.user, c.req.param("id"), {
      range,
      recurringGroupId,
      dueFrom,
      dueTo,
      paymentStatus: paymentStatus as (typeof paymentStatuses)[number] | undefined,
    })
    return c.json(collection("transactions", list, selfHref(c.req.url)))
  })
  .put("/:id/transactions/order", validate("json", reorderSchema), async (c) => {
    const { month, transactionIds } = c.req.valid("json")
    await transactions.reorder({ env: c.env, db: c.var.db, user: c.var.user }, c.req.param("id"), month, transactionIds)
    return c.body(null, 204)
  })
  .get("/:id/invoices", async (c) => {
    const list = await invoices.listByPlan(c.var.db, c.var.user, c.req.param("id"), parseMonthRange(c.req.query()))
    return c.json(collection("invoices", list, selfHref(c.req.url)))
  })
  // Transações e faturas de vários meses numa ida só (o carrossel do dashboard carrega uma janela de
  // meses de uma vez). Todos os meses do intervalo vêm na resposta, mesmo vazios.
  .get("/:id/month-data", async (c) => {
    const { from, to } = c.req.query()
    if (!from || !to || !isYearMonth(from) || !isYearMonth(to)) {
      throw badRequest("Informe 'from' e 'to' no formato AAAA-MM")
    }
    if (from > to) throw badRequest("'from' deve ser anterior ou igual a 'to'")
    if (monthsBetween(from, to) > MONTH_DATA_LIMIT) {
      throw badRequest(`Intervalo máximo de ${MONTH_DATA_LIMIT} meses`)
    }
    const planId = c.req.param("id")
    const [transactionList, invoiceList] = await Promise.all([
      transactions.listByPlan(c.var.db, c.var.user, planId, {
        range: { from: monthBounds(from).from, to: monthBounds(to).to },
      }),
      invoices.listByPlan(c.var.db, c.var.user, planId, { from, to }),
    ])
    const months = monthRange(from, to).map((month) => ({
      month,
      transactions: transactionList.filter((t) => t.referenceDate.startsWith(month)),
      invoices: invoiceList.filter((i) => i.referenceMonth === month),
    }))
    return c.json({ months })
  })
  .get("/:id/months", async (c) => c.json(await transactions.months(c.var.db, c.var.user, c.req.param("id"))))
  .get("/:id/summary", async (c) =>
    c.json(await transactions.summary(c.var.db, c.var.user, c.req.param("id"), parseDateRange(c.req.query()))),
  )
