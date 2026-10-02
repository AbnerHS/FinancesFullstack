import { Hono } from "hono"
import { getDb } from "./db/client.ts"
import { ApiError } from "./lib/errors.ts"
import { requireAuth } from "./middleware/auth.ts"
import { authRoutes } from "./routes/auth.ts"
import { cardRoutes } from "./routes/cards.ts"
import { categoryRoutes } from "./routes/categories.ts"
import { invoiceRoutes } from "./routes/invoices.ts"
import { planRoutes } from "./routes/plans.ts"
import { reportRoutes } from "./routes/reports.ts"
import { transactionRoutes } from "./routes/transactions.ts"
import { userRoutes } from "./routes/users.ts"
import type { AppEnv } from "./types.ts"

export const app = new Hono<AppEnv>().basePath("/api")

app.use(async (c, next) => {
  c.set("db", getDb(c.env.DB))
  await next()
})

app.get("/health", (c) => c.json({ status: "UP" }))

// Rotas públicas ficam antes do requireAuth.
app.route("/auth", authRoutes)

app.use("*", requireAuth)

app.route("/users", userRoutes)
app.route("/plans", planRoutes)
app.route("/transaction-categories", categoryRoutes)
app.route("/credit-cards", cardRoutes)
app.route("/credit-card-invoices", invoiceRoutes)
app.route("/transactions", transactionRoutes)
app.route("/reports", reportRoutes)

app.notFound((c) =>
  c.json(new ApiError(404, "Recurso não encontrado", "Rota não encontrada").toProblem(c.req.path), 404),
)

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(err.toProblem(c.req.path), err.status as 400)
  }
  console.error(err)
  const problem = new ApiError(500, "Erro interno do servidor", "Erro inesperado").toProblem(c.req.path)
  return c.json(problem, 500)
})
