import { Hono } from "hono"
import { z } from "zod"
import { validate } from "../lib/validation.ts"
import * as shopping from "../services/shopping.ts"
import type { AppEnv } from "../types.ts"

const name = z.string().trim().min(1, "Informe o nome do produto").max(80, "Nome com até 80 caracteres")
const fields = {
  name,
  category: z.string().trim().max(40, "Categoria com até 40 caracteres").nullable().optional(),
  checked: z.boolean().optional(),
  note: z.string().trim().max(80, "Observação com até 80 caracteres").nullable().optional(),
}

export const createShoppingItemsSchema = z.object({
  items: z.array(z.object(fields)).min(1, "Informe ao menos um produto").max(300, "Até 300 produtos por vez"),
})
export const setAllShoppingItemsSchema = z.object({ checked: z.boolean() })

export const shoppingRoutes = new Hono<AppEnv>()
  .patch("/:id", validate("json", z.object(fields).partial()), async (c) =>
    c.json(await shopping.update(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json"))),
  )
  .delete("/:id", async (c) => {
    await shopping.remove(c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
