import { Hono } from "hono"
import { z } from "zod"
import { collection } from "../lib/hal.ts"
import { validate } from "../lib/validation.ts"
import * as categories from "../services/categories.ts"
import type { AppEnv } from "../types.ts"

const nameSchema = z.object({ name: z.string().trim().min(1, "O nome da categoria é obrigatório") })

export const categoryRoutes = new Hono<AppEnv>()
  .post("/", validate("json", nameSchema), async (c) => {
    const category = await categories.create(c.var.db, c.req.valid("json").name)
    c.header("Location", `/api/transaction-categories/${category.id}`)
    return c.json(categories.categoryModel(category), 201)
  })
  .get("/", async (c) => {
    const list = await categories.list(c.var.db)
    return c.json(collection("transactionCategories", list.map(categories.categoryModel), "/api/transaction-categories"))
  })
  .get("/:id", async (c) => c.json(categories.categoryModel(await categories.findById(c.var.db, c.req.param("id")))))
  .put("/:id", validate("json", nameSchema), async (c) =>
    c.json(categories.categoryModel(await categories.rename(c.var.db, c.req.param("id"), c.req.valid("json").name))),
  )
  .patch("/:id", validate("json", nameSchema.partial()), async (c) => {
    const { name } = c.req.valid("json")
    const category =
      name === undefined
        ? await categories.findById(c.var.db, c.req.param("id"))
        : await categories.rename(c.var.db, c.req.param("id"), name)
    return c.json(categories.categoryModel(category))
  })
  .delete("/:id", async (c) => {
    await categories.remove(c.var.db, c.req.param("id"))
    return c.body(null, 204)
  })
