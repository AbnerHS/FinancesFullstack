import { Hono } from "hono"
import { z } from "zod"
import { collection } from "../lib/hal.ts"
import { id } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import * as cards from "../services/cards.ts"
import * as invoices from "../services/invoices.ts"
import type { AppEnv } from "../types.ts"

const cardSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório"),
  userId: id("O id do Usuário do cartão é obrigatório"),
})

export const cardRoutes = new Hono<AppEnv>()
  .post("/", validate("json", cardSchema), async (c) => {
    const card = await cards.create(c.var.db, c.var.user, c.req.valid("json"))
    c.header("Location", `/api/credit-cards/${card.id}`)
    return c.json(cards.cardModel(card), 201)
  })
  .get("/:id", async (c) => c.json(cards.cardModel(await cards.getAccessibleCard(c.var.db, c.var.user, c.req.param("id")))))
  .put("/:id", validate("json", cardSchema), async (c) =>
    c.json(cards.cardModel(await cards.update(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json")))),
  )
  .patch("/:id", validate("json", cardSchema.partial()), async (c) =>
    c.json(cards.cardModel(await cards.update(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json")))),
  )
  .delete("/:id", async (c) => {
    await cards.remove(c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
  .get("/:id/invoices", async (c) => {
    const { card, invoices: list } = await cards.invoicesOfCard(c.var.db, c.var.user, c.req.param("id"))
    return c.json(
      collection(
        "invoices",
        list.map((invoice) => invoices.invoiceModel(invoice, card.name)),
        `/api/credit-cards/${card.id}/invoices`,
      ),
    )
  })
