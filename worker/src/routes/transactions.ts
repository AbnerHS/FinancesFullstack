import { Hono } from "hono"
import type { Context } from "hono"
import { z } from "zod"
import { paymentStatuses, transactionTypes } from "../db/schema.ts"
import { id, isoDate } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import * as transactions from "../services/transactions.ts"
import type { AppEnv } from "../types.ts"

const fields = {
  description: z.string().trim().min(1, "A descrição é obrigatória"),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  type: z.enum(transactionTypes, "O tipo de transação (REVENUE/EXPENSE) é obrigatório"),
  referenceDate: isoDate,
  responsibleUserId: id().nullable().optional(),
  category: z
    .object({ id: id().nullable().optional(), name: z.string().nullable().optional() })
    .nullable()
    .optional(),
  creditCardInvoiceId: id().nullable().optional(),
  isClearedByInvoice: z.boolean().nullable().optional(),
  dueDate: isoDate.nullable().optional(),
  paymentDate: isoDate.nullable().optional(),
  paymentStatus: z.enum(paymentStatuses).nullable().optional(),
  billingDocument: z
    .object({ type: z.enum(["LINK", "FILE"], "O tipo do documento é obrigatório."), url: z.string().nullable().optional() })
    .nullable()
    .optional(),
  order: z.number().int().nullable().optional(),
}

const replaceSchema = z.object(fields)
const patchSchema = replaceSchema.partial()
const createSchema = replaceSchema.extend({ planId: id("O ID do plano é obrigatório") })
const recurringSchema = z.object({
  transaction: createSchema,
  occurrences: z
    .number()
    .int()
    .min(2, "O número de ocorrências deve ser pelo menos 2")
    .max(transactions.MAX_OCCURRENCES, `O número de ocorrências deve ser no máximo ${transactions.MAX_OCCURRENCES}`),
})

const ctx = (c: Context<AppEnv>) => ({ env: c.env, db: c.var.db, user: c.var.user })

export const transactionRoutes = new Hono<AppEnv>()
  .post("/", validate("json", createSchema), async (c) => {
    const created = await transactions.create(ctx(c), c.req.valid("json"))
    c.header("Location", `/api/transactions/${created.id}`)
    return c.json(created, 201)
  })
  .post("/recurring", validate("json", recurringSchema), async (c) =>
    c.json(await transactions.createRecurring(ctx(c), c.req.valid("json"))),
  )
  .get("/:id", async (c) => {
    const transaction = await transactions.getAccessibleTransaction(c.var.db, c.var.user, c.req.param("id"))
    return c.json(await transactions.findModel(c.var.db, transaction.id))
  })
  .put("/:id", validate("json", replaceSchema), async (c) =>
    c.json(await transactions.update(ctx(c), c.req.param("id"), c.req.valid("json"), "put")),
  )
  .patch("/:id", validate("json", patchSchema), async (c) =>
    c.json(await transactions.update(ctx(c), c.req.param("id"), c.req.valid("json"), "patch")),
  )
  .delete("/:id", async (c) => {
    await transactions.remove(ctx(c), c.req.param("id"))
    return c.body(null, 204)
  })
