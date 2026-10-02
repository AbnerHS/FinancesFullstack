import { Hono } from "hono"
import { z } from "zod"
import { badRequest } from "../lib/errors.ts"
import { collection } from "../lib/hal.ts"
import { id, parseDateRange, yearMonth } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import { isYearMonth } from "../lib/dates.ts"
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
    await plans.remove(c.var.db, c.var.user, c.req.param("id"))
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
    const range = parseDateRange(c.req.query())
    if (!range) throw badRequest("Informe 'month' (AAAA-MM) ou 'from' e 'to' (AAAA-MM-DD)")
    const list = await transactions.listByPlan(c.var.db, c.var.user, c.req.param("id"), range)
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
  .get("/:id/months", async (c) => c.json(await transactions.months(c.var.db, c.var.user, c.req.param("id"))))
  .get("/:id/summary", async (c) =>
    c.json(await transactions.summary(c.var.db, c.var.user, c.req.param("id"), parseDateRange(c.req.query()))),
  )
