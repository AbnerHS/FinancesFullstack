import { Hono } from "hono"
import { z } from "zod"
import { id, yearMonth } from "../lib/query.ts"
import { validate } from "../lib/validation.ts"
import * as forecasts from "../services/forecasts.ts"
import type { AppEnv } from "../types.ts"

export const forecastFields = {
  category: z.object({ id: id().nullable().optional(), name: z.string().nullable().optional() }),
  amount: z.coerce.number().positive("O valor previsto deve ser positivo"),
  responsibleUserId: id().nullable().optional(),
  dueDay: z.coerce
    .number()
    .int()
    .min(1, "Dia de vencimento entre 1 e 31")
    .max(31, "Dia de vencimento entre 1 e 31")
    .nullable()
    .optional(),
  startMonth: yearMonth.optional(),
  endMonth: yearMonth.nullable().optional(),
}

export const createForecastSchema = z.object(forecastFields)

export const forecastRoutes = new Hono<AppEnv>()
  .patch("/:id", validate("json", z.object(forecastFields).partial()), async (c) =>
    c.json(await forecasts.update(c.var.db, c.var.user, c.req.param("id"), c.req.valid("json"))),
  )
  .delete("/:id", async (c) => {
    await forecasts.remove(c.var.db, c.var.user, c.req.param("id"))
    return c.body(null, 204)
  })
