import { and, asc, eq, gt, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm"
import type { BatchItem } from "drizzle-orm/batch"
import type { Database } from "../db/client.ts"
import {
  creditCardInvoices,
  type Subscription,
  subscriptions,
  transactionCategories,
  transactions,
  type User,
} from "../db/schema.ts"
import {
  addMonthsToYearMonth,
  currentYearMonth,
  dayOfMonth,
  monthRange,
} from "../lib/dates.ts"
import { badRequest, notFound } from "../lib/errors.ts"
import { withLinks } from "../lib/hal.ts"
import { fromCents, toCents } from "../lib/money.ts"
import { isParticipant, requirePlanAccess } from "./access.ts"
import * as categories from "./categories.ts"
import { assertCardInPlan } from "./invoices.ts"
import { nextOrder } from "./transactions.ts"

// Assinaturas: contas mensais sem fim fixo. Em vez de criar N ocorrências de uma vez (como a
// recorrência), a transação de cada mês é gerada quando o mês é consultado, até
// GENERATION_HORIZON meses à frente. `generated_through` só avança: apagar a cobrança de um mês
// (pular aquele mês) não faz ela voltar.

/** Quantos meses à frente do atual a geração vai, no máximo. */
export const GENERATION_HORIZON = 12

export type SubscriptionInput = {
  name?: string
  amount?: number
  category?: { id?: string | null; name?: string | null } | null
  responsibleUserId?: string | null
  billingDay?: number
  chargeMode?: "BILL" | "AUTO"
  creditCardId?: string | null
  startMonth?: string
  endMonth?: string | null
}

export function subscriptionModel(subscription: Subscription, categoryName: string | null) {
  return withLinks(
    {
      id: subscription.id,
      planId: subscription.planId,
      name: subscription.name,
      amount: fromCents(subscription.amountCents),
      category: subscription.categoryId ? { id: subscription.categoryId, name: categoryName } : null,
      responsibleUserId: subscription.responsibleUserId,
      billingDay: subscription.billingDay,
      chargeMode: subscription.chargeMode,
      creditCardId: subscription.creditCardId,
      startMonth: subscription.startMonth,
      endMonth: subscription.endMonth,
      active: !subscription.endMonth || subscription.endMonth >= currentYearMonth(),
      createdAt: subscription.createdAt,
    },
    { self: `/api/subscriptions/${subscription.id}`, plan: `/api/plans/${subscription.planId}` },
  )
}

const selectWithCategory = (db: Database) =>
  db
    .select({ subscription: subscriptions, categoryName: transactionCategories.name })
    .from(subscriptions)
    .leftJoin(transactionCategories, eq(transactionCategories.id, subscriptions.categoryId))

export async function findModel(db: Database, id: string) {
  const row = await selectWithCategory(db).where(eq(subscriptions.id, id)).get()
  if (!row) throw notFound("Assinatura não encontrada")
  return subscriptionModel(row.subscription, row.categoryName)
}

export async function list(db: Database, user: User, planId: string) {
  await requirePlanAccess(db, planId, user)
  const rows = await selectWithCategory(db)
    .where(eq(subscriptions.planId, planId))
    .orderBy(asc(sql`lower(${subscriptions.name})`))
  return rows.map((row) => subscriptionModel(row.subscription, row.categoryName))
}

export async function get(db: Database, user: User, id: string) {
  await getAccessible(db, user, id)
  return findModel(db, id)
}

async function getAccessible(db: Database, user: User, id: string) {
  const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, id) })
  if (!subscription) throw notFound("Assinatura não encontrada")
  await requirePlanAccess(db, subscription.planId, user)
  return subscription
}

async function resolveResponsible(db: Database, planId: string, responsibleUserId: string | null | undefined) {
  const responsible = responsibleUserId ?? null
  if (responsible && !(await isParticipant(db, planId, responsible))) {
    throw badRequest("O responsável precisa participar do plano.")
  }
  return responsible
}

function assertMonths(startMonth: string, endMonth: string | null) {
  if (endMonth && endMonth < startMonth) {
    throw badRequest("O mês de encerramento não pode ser anterior ao início.")
  }
}

/** Faturas do plano por cartão e mês ("cartão|AAAA-MM" → id), para ligar as cobranças. */
type InvoiceLookup = Map<string, string>

async function invoiceLookup(db: Database, planId: string, cardIds: Array<string | null>): Promise<InvoiceLookup> {
  const ids = [...new Set(cardIds.filter((id): id is string => Boolean(id)))]
  if (ids.length === 0) return new Map()
  const rows = await db
    .select({ id: creditCardInvoices.id, card: creditCardInvoices.creditCardId, month: creditCardInvoices.referenceMonth })
    .from(creditCardInvoices)
    .where(and(eq(creditCardInvoices.planId, planId), inArray(creditCardInvoices.creditCardId, ids)))
  return new Map(rows.map((row) => [`${row.card}|${row.month}`, row.id]))
}

/**
 * Valores da cobrança de um mês a partir da assinatura. Com cartão, não há vencimento: a cobrança
 * entra na fatura do cartão naquele mês (se ela já existe; senão, quando for criada). `invoices`
 * só é passado quando a fatura deve ser (re)definida: sem ele, o vínculo atual fica como está.
 */
function chargeValues(subscription: Subscription, month: string, invoices?: InvoiceLookup) {
  const date = dayOfMonth(month, subscription.billingDay)
  const values = {
    description: subscription.name,
    amountCents: subscription.amountCents,
    categoryId: subscription.categoryId,
    responsibleUserId: subscription.responsibleUserId,
    referenceDate: date,
    dueDate: subscription.chargeMode === "BILL" && !subscription.creditCardId ? date : null,
  }
  if (!invoices) return values
  const invoiceId = subscription.creditCardId
    ? (invoices.get(`${subscription.creditCardId}|${month}`) ?? null)
    : null
  return { ...values, creditCardInvoiceId: invoiceId, clearedByInvoice: Boolean(invoiceId) }
}

/** Cobrança ainda editável: não está numa fatura já paga (fatura paga é história). */
const notInPaidInvoice = () =>
  or(
    isNull(transactions.creditCardInvoiceId),
    sql`${transactions.creditCardInvoiceId} not in (select id from credit_card_invoices where payment_status = 'PAID')`,
  )

/**
 * Gera as cobranças que faltam das assinaturas do plano até `throughMonth` (limitado ao horizonte).
 * Idempotente: o índice único (assinatura, mês) ignora o que já existe, então duas requisições ao
 * mesmo tempo não duplicam nada.
 */
export async function ensureGenerated(db: Database, planId: string, throughMonth: string) {
  const horizon = addMonthsToYearMonth(currentYearMonth(), GENERATION_HORIZON)
  const target = throughMonth < horizon ? throughMonth : horizon

  const pending = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.planId, planId),
        sql`${subscriptions.startMonth} <= ${target}`,
        or(isNull(subscriptions.generatedThrough), lt(subscriptions.generatedThrough, target)),
        or(isNull(subscriptions.endMonth), gt(subscriptions.endMonth, sql`coalesce(${subscriptions.generatedThrough}, '')`)),
      ),
    )
  if (pending.length === 0) return

  const invoices = await invoiceLookup(db, planId, pending.map((subscription) => subscription.creditCardId))
  const createdAt = new Date().toISOString()
  const statements = pending.flatMap((subscription) => {
    const from = subscription.generatedThrough
      ? addMonthsToYearMonth(subscription.generatedThrough, 1)
      : subscription.startMonth
    const last = subscription.endMonth && subscription.endMonth < target ? subscription.endMonth : target
    const months = from <= last ? monthRange(from < subscription.startMonth ? subscription.startMonth : from, last) : []
    return [
      ...months.map((month) => {
        const values = chargeValues(subscription, month, invoices)
        return db
          .insert(transactions)
          .values({
            ...values,
            id: crypto.randomUUID(),
            planId: subscription.planId,
            type: "EXPENSE",
            createdAt,
            subscriptionId: subscription.id,
            subscriptionMonth: month,
            displayOrder: nextOrder(subscription.planId, values.referenceDate),
          })
          .onConflictDoNothing()
      }),
      db.update(subscriptions).set({ generatedThrough: last }).where(eq(subscriptions.id, subscription.id)),
    ]
  })
  await db.batch(statements as [(typeof statements)[number], ...typeof statements])
}

export async function create(db: Database, user: User, planId: string, input: Required<Pick<SubscriptionInput, "name" | "amount" | "billingDay" | "chargeMode" | "startMonth">> & SubscriptionInput) {
  await requirePlanAccess(db, planId, user)
  assertMonths(input.startMonth, input.endMonth ?? null)
  if (input.creditCardId) await assertCardInPlan(db, planId, input.creditCardId)
  const [subscription] = await db
    .insert(subscriptions)
    .values({
      id: crypto.randomUUID(),
      planId,
      name: input.name.trim(),
      amountCents: toCents(input.amount),
      categoryId: await categories.resolve(db, input.category),
      responsibleUserId: await resolveResponsible(db, planId, input.responsibleUserId),
      billingDay: input.billingDay,
      chargeMode: input.chargeMode,
      creditCardId: input.creditCardId ?? null,
      startMonth: input.startMonth,
      endMonth: input.endMonth ?? null,
      generatedThrough: null,
      createdAt: new Date().toISOString(),
    })
    .returning()
  // Já gera até o mês atual, para a cobrança aparecer no dashboard sem esperar a próxima consulta.
  await ensureGenerated(db, planId, currentYearMonth())
  return findModel(db, subscription!.id)
}

/**
 * Atualiza a assinatura e as cobranças ainda em aberto a partir do mês atual (as pagas e as de
 * meses passados ficam como estão). Encerrar apaga as cobranças pendentes depois do último mês.
 */
export async function update(db: Database, user: User, id: string, input: SubscriptionInput) {
  const current = await getAccessible(db, user, id)
  const has = (key: keyof SubscriptionInput) => Object.prototype.hasOwnProperty.call(input, key)

  const next: Subscription = { ...current }
  if (has("name")) next.name = input.name!.trim()
  if (has("amount")) next.amountCents = toCents(input.amount!)
  if (has("category")) next.categoryId = await categories.resolve(db, input.category)
  if (has("responsibleUserId")) next.responsibleUserId = await resolveResponsible(db, current.planId, input.responsibleUserId)
  if (has("billingDay")) next.billingDay = input.billingDay!
  if (has("chargeMode")) next.chargeMode = input.chargeMode!
  if (has("creditCardId")) {
    next.creditCardId = input.creditCardId ?? null
    if (next.creditCardId) await assertCardInPlan(db, current.planId, next.creditCardId)
  }
  if (has("startMonth")) next.startMonth = input.startMonth!
  if (has("endMonth")) next.endMonth = input.endMonth ?? null
  assertMonths(next.startMonth, next.endMonth)

  const thisMonth = currentYearMonth()
  // Encerrou (ou antecipou o fim): a geração para no último mês. Reativou: volta a gerar a partir
  // do mês atual, sem recriar os meses em que esteve encerrada.
  if (next.endMonth && next.generatedThrough && next.generatedThrough > next.endMonth) {
    next.generatedThrough = next.endMonth
  }
  if (current.endMonth && !next.endMonth) {
    const resumeAfter = addMonthsToYearMonth(thisMonth, -1)
    if (!next.generatedThrough || next.generatedThrough < resumeAfter) next.generatedThrough = resumeAfter
  }
  // Início antecipado: gera os meses novos do começo (os que já existem são ignorados).
  if (next.startMonth < current.startMonth) {
    next.generatedThrough = addMonthsToYearMonth(next.startMonth, -1)
  }

  const { id: _id, planId: _planId, createdAt: _createdAt, ...fields } = next
  const batch: BatchItem<"sqlite">[] = [db.update(subscriptions).set(fields).where(eq(subscriptions.id, id))]

  // Cobranças pendentes fora do novo intervalo (depois do fim ou antes do início) saem.
  const outOfRange = or(
    next.endMonth ? gt(transactions.subscriptionMonth, next.endMonth) : sql`0`,
    lt(transactions.subscriptionMonth, next.startMonth),
  )
  batch.push(
    db
      .delete(transactions)
      .where(
        and(
          eq(transactions.subscriptionId, id),
          eq(transactions.paymentStatus, "PENDING"),
          notInPaidInvoice(),
          outOfRange,
        ),
      ),
  )

  // As pendentes a partir do mês atual recebem os novos valores.
  const open = await db
    .select({ id: transactions.id, month: transactions.subscriptionMonth })
    .from(transactions)
    .where(
      and(
        eq(transactions.subscriptionId, id),
        eq(transactions.paymentStatus, "PENDING"),
        notInPaidInvoice(),
        isNotNull(transactions.subscriptionMonth),
        gte(transactions.subscriptionMonth, thisMonth),
      ),
    )
  // Cartão novo (ou trocado/removido): as cobranças em aberto mudam de fatura também.
  const invoices =
    next.creditCardId !== current.creditCardId ? await invoiceLookup(db, current.planId, [next.creditCardId]) : undefined
  for (const charge of open) {
    batch.push(
      db.update(transactions).set(chargeValues(next, charge.month!, invoices)).where(eq(transactions.id, charge.id)),
    )
  }
  await db.batch(batch as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]])
  await ensureGenerated(db, current.planId, thisMonth)
  return findModel(db, id)
}

/** Exclui a assinatura: as cobranças pendentes a partir do mês atual saem; o histórico fica. */
export async function remove(db: Database, user: User, id: string) {
  await getAccessible(db, user, id)
  await db.batch([
    db
      .delete(transactions)
      .where(
        and(
          eq(transactions.subscriptionId, id),
          eq(transactions.paymentStatus, "PENDING"),
          notInPaidInvoice(),
          gte(transactions.subscriptionMonth, currentYearMonth()),
        ),
      ),
    // O restante fica sem assinatura (ON DELETE SET NULL).
    db.delete(subscriptions).where(eq(subscriptions.id, id)),
  ])
}
