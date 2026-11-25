import { and, asc, eq, inArray, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type Forecast, forecastAmounts, forecasts, transactionCategories, type User } from "../db/schema.ts"
import { currentYearMonth } from "../lib/dates.ts"
import { isUniqueViolation } from "../lib/db-errors.ts"
import { ApiError, badRequest, notFound } from "../lib/errors.ts"
import { withLinks } from "../lib/hal.ts"
import { fromCents, toCents } from "../lib/money.ts"
import { isParticipant, requirePlanAccess } from "./access.ts"
import * as categories from "./categories.ts"

// Previsões de gasto por categoria. Só o cadastro fica aqui: o gasto real (despesas da categoria
// no mês) e o que falta para a previsão são calculados pelo frontend a partir das transações do
// mês, que ele já carrega.

export type ForecastInput = {
  category?: { id?: string | null; name?: string | null } | null
  amount?: number
  responsibleUserId?: string | null
  dueDay?: number | null
  startMonth?: string
  endMonth?: string | null
}

type AmountRow = { fromMonth: string; amountCents: number }

function forecastModel(forecast: Forecast, categoryName: string | null, amounts: AmountRow[]) {
  const sorted = [...amounts].sort((a, b) => a.fromMonth.localeCompare(b.fromMonth))
  const thisMonth = currentYearMonth()
  const current = [...sorted].reverse().find((row) => row.fromMonth <= thisMonth) ?? sorted[0]
  return withLinks(
    {
      id: forecast.id,
      planId: forecast.planId,
      category: { id: forecast.categoryId, name: categoryName },
      responsibleUserId: forecast.responsibleUserId,
      dueDay: forecast.dueDay,
      startMonth: forecast.startMonth,
      endMonth: forecast.endMonth,
      /** Valor vigente no mês atual. */
      amount: fromCents(current?.amountCents ?? 0),
      /** Histórico: cada valor vale a partir de `fromMonth`. */
      amounts: sorted.map((row) => ({ fromMonth: row.fromMonth, amount: fromCents(row.amountCents) })),
      createdAt: forecast.createdAt,
    },
    { self: `/api/forecasts/${forecast.id}`, plan: `/api/plans/${forecast.planId}` },
  )
}

async function models(db: Database, rows: Array<{ forecast: Forecast; categoryName: string | null }>) {
  if (rows.length === 0) return []
  const amounts = await db
    .select()
    .from(forecastAmounts)
    .where(inArray(forecastAmounts.forecastId, rows.map((row) => row.forecast.id)))
  return rows.map((row) =>
    forecastModel(
      row.forecast,
      row.categoryName,
      amounts.filter((amount) => amount.forecastId === row.forecast.id),
    ),
  )
}

const selectWithCategory = (db: Database) =>
  db
    .select({ forecast: forecasts, categoryName: transactionCategories.name })
    .from(forecasts)
    .innerJoin(transactionCategories, eq(transactionCategories.id, forecasts.categoryId))

export async function list(db: Database, user: User, planId: string) {
  await requirePlanAccess(db, planId, user)
  const rows = await selectWithCategory(db)
    .where(eq(forecasts.planId, planId))
    .orderBy(asc(sql`lower(${transactionCategories.name})`))
  return models(db, rows)
}

async function findModel(db: Database, id: string) {
  const rows = await selectWithCategory(db).where(eq(forecasts.id, id))
  if (rows.length === 0) throw notFound("Previsão não encontrada")
  return (await models(db, rows))[0]!
}

async function getAccessible(db: Database, user: User, id: string) {
  const forecast = await db.query.forecasts.findFirst({ where: eq(forecasts.id, id) })
  if (!forecast) throw notFound("Previsão não encontrada")
  await requirePlanAccess(db, forecast.planId, user)
  return forecast
}

async function resolveResponsible(db: Database, planId: string, responsibleUserId: string | null | undefined) {
  const responsible = responsibleUserId ?? null
  if (responsible && !(await isParticipant(db, planId, responsible))) {
    throw badRequest("O responsável precisa participar do plano.")
  }
  return responsible
}

async function resolveCategory(db: Database, category: ForecastInput["category"]) {
  const categoryId = await categories.resolve(db, category)
  if (!categoryId) throw badRequest("Informe a categoria da previsão.")
  return categoryId
}

const duplicate = () =>
  new ApiError(409, "Conflito", "Já existe uma previsão para esta categoria no plano. Edite a existente.")

function assertMonths(startMonth: string, endMonth: string | null) {
  if (endMonth && endMonth < startMonth) {
    throw badRequest("O mês de encerramento não pode ser anterior ao início.")
  }
}

export async function create(
  db: Database,
  user: User,
  planId: string,
  input: ForecastInput & Required<Pick<ForecastInput, "amount">>,
) {
  await requirePlanAccess(db, planId, user)
  const startMonth = input.startMonth ?? currentYearMonth()
  assertMonths(startMonth, input.endMonth ?? null)
  const id = crypto.randomUUID()
  try {
    await db.batch([
      db.insert(forecasts).values({
        id,
        planId,
        categoryId: await resolveCategory(db, input.category),
        responsibleUserId: await resolveResponsible(db, planId, input.responsibleUserId),
        dueDay: input.dueDay ?? null,
        startMonth,
        endMonth: input.endMonth ?? null,
        createdAt: new Date().toISOString(),
      }),
      db.insert(forecastAmounts).values({ forecastId: id, fromMonth: startMonth, amountCents: toCents(input.amount) }),
    ])
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
  return findModel(db, id)
}

/**
 * Atualiza a previsão. Um valor novo vale do mês atual em diante (ou do início, se a previsão ainda
 * não começou); os meses anteriores guardam o valor que valia.
 */
export async function update(db: Database, user: User, id: string, input: ForecastInput) {
  const current = await getAccessible(db, user, id)
  const has = (key: keyof ForecastInput) => Object.prototype.hasOwnProperty.call(input, key)

  const next: Forecast = { ...current }
  if (has("category")) next.categoryId = await resolveCategory(db, input.category)
  if (has("responsibleUserId")) next.responsibleUserId = await resolveResponsible(db, current.planId, input.responsibleUserId)
  if (has("dueDay")) next.dueDay = input.dueDay ?? null
  if (has("startMonth")) next.startMonth = input.startMonth!
  if (has("endMonth")) next.endMonth = input.endMonth ?? null
  assertMonths(next.startMonth, next.endMonth)

  const { id: _id, planId: _planId, createdAt: _createdAt, ...fields } = next
  const thisMonth = currentYearMonth()
  const fromMonth = next.startMonth > thisMonth ? next.startMonth : thisMonth
  try {
    await db.batch([
      db.update(forecasts).set(fields).where(eq(forecasts.id, id)),
      ...(input.amount !== undefined
        ? [
            db
              .insert(forecastAmounts)
              .values({ forecastId: id, fromMonth, amountCents: toCents(input.amount) })
              .onConflictDoUpdate({
                target: [forecastAmounts.forecastId, forecastAmounts.fromMonth],
                set: { amountCents: toCents(input.amount) },
              }),
          ]
        : []),
      // Início movido para depois de valores antigos: o primeiro valor passa a valer do início.
      db
        .update(forecastAmounts)
        .set({ fromMonth: next.startMonth })
        .where(
          and(
            eq(forecastAmounts.forecastId, id),
            sql`${forecastAmounts.fromMonth} = (select min(from_month) from forecast_amounts where forecast_id = ${id})`,
            sql`${forecastAmounts.fromMonth} > ${next.startMonth}`,
          ),
        ),
    ])
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
  return findModel(db, id)
}

export async function remove(db: Database, user: User, id: string) {
  await getAccessible(db, user, id)
  await db.delete(forecasts).where(eq(forecasts.id, id))
}
