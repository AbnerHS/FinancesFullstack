import { Hono } from "hono"
import { z } from "zod"
import { id, yearMonth } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import * as invoices from "../services/invoices.ts"
import type { AppEnv } from "../types.ts"

const invoiceSchema = z.object({
  creditCardId: id("O id do cartão de crédito é obrigatório"),
  referenceMonth: yearMonth,
  amount: z.coerce.number().positive("O valor da fatura deve ser positivo"),
})

const createSchema = invoiceSchema.extend({ planId: id("O id do plano é obrigatório") })

export const invoiceRoutes = new Hono<AppEnv>()
  .post("/", validate("json", createSchema), async (c) => {
    const invoice = await invoices.create(c.var.db, c.var.user, c.req.valid("json"))
    c.header("Location", `/api/credit-card-invoices/${invoice.id}`)
    return c.json(await invoices.findModel(c.var.db, invoice.id), 201)
  })
  .get("/:id", async (c) => {
    const invoice = await invoices.getAccessibleInvoice(c.var.db, c.var.user, c.req.param("id"))
    return c.json(await invoices.findModel(c.var.db, invoice.id))
  })
  .put("/:id", validate("json", invoiceSchema), async (c) => {
    await invoices.update(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json"))
    return c.json(await invoices.findModel(c.var.db, c.req.param("id")))
  })
  .delete("/:id", async (c) => {
    await invoices.remove(c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
