import { Hono } from "hono"
import { badRequest } from "../lib/errors.ts"
import { parseDateRange } from "../lib/query.ts"
import * as transactions from "../services/transactions.ts"
import type { AppEnv } from "../types.ts"

export const reportRoutes = new Hono<AppEnv>().get("/spending-by-category", async (c) => {
  const planId = c.req.query("planId")
  if (!planId) throw badRequest("Informe o 'planId'")
  return c.json(await transactions.spendingByCategory(c.var.db, c.var.user, planId, parseDateRange(c.req.query())))
})
