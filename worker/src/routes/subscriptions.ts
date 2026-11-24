import { Hono } from "hono"
import { z } from "zod"
import { subscriptionChargeModes } from "../db/schema.ts"
import { id, yearMonth } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import * as subscriptions from "../services/subscriptions.ts"
import type { AppEnv } from "../types.ts"

export const subscriptionFields = {
  name: z.string().trim().min(1, "O nome da assinatura é obrigatório").max(120),
  amount: z.coerce.number().positive("O valor da assinatura deve ser positivo"),
  category: z
    .object({ id: id().nullable().optional(), name: z.string().nullable().optional() })
    .nullable()
    .optional(),
  responsibleUserId: id().nullable().optional(),
  billingDay: z.coerce.number().int().min(1, "Dia de cobrança entre 1 e 31").max(31, "Dia de cobrança entre 1 e 31"),
  chargeMode: z.enum(subscriptionChargeModes, "Informe como a assinatura é cobrada"),
  creditCardId: id().nullable().optional(),
  startMonth: yearMonth,
  endMonth: yearMonth.nullable().optional(),
}

export const createSubscriptionSchema = z.object(subscriptionFields)

export const subscriptionRoutes = new Hono<AppEnv>()
  .get("/:id", async (c) => c.json(await subscriptions.get(c.var.db, c.var.user, c.req.param("id"))))
  .patch("/:id", validate("json", z.object(subscriptionFields).partial()), async (c) =>
    c.json(await subscriptions.update(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json"))),
  )
  .delete("/:id", async (c) => {
    await subscriptions.remove(c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
