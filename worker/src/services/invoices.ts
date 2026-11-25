import { and, between, eq, max, ne, or, isNull, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import {
  type CreditCardInvoice,
  creditCardInvoices,
  creditCards,
  transactions,
  type User,
} from "../db/schema.ts"
import { addMonthsToYearMonth, currentDate, dayOfMonth, daysInMonth, monthBounds } from "../lib/dates.ts"
import { ApiError, badRequest, notFound } from "../lib/errors.ts"
import { isUniqueViolation } from "../lib/db-errors.ts"
import { withLinks } from "../lib/hal.ts"
import { fromCents, toCents } from "../lib/money.ts"
import { getPlanOrThrow, participantIds, requirePlanAccess } from "./access.ts"

// Porta do CreditCardInvoiceService. A fatura pertence a um plano e a um mês (`referenceMonth`);
// as transações vinculadas ficam com a data de competência dentro desse mês.

export type InvoiceInput = {
  creditCardId: string
  referenceMonth: string
  amount: number
  dueDate?: string | null
  paymentStatus?: "PENDING" | "PAID" | null
  paymentDate?: string | null
}

export function invoiceModel(
  invoice: CreditCardInvoice,
  creditCardName: string | null,
  creditCardOwnerId: string | null = null,
) {
  return withLinks(
    {
      id: invoice.id,
      planId: invoice.planId,
      creditCardId: invoice.creditCardId,
      creditCardName,
      // Dono do cartão: é a quem a fatura conta no filtro por responsável.
      creditCardOwnerId,
      referenceMonth: invoice.referenceMonth,
      amount: fromCents(invoice.amountCents),
      dueDate: invoice.dueDate,
      paymentStatus: invoice.paymentStatus,
      paymentDate: invoice.paymentDate,
    },
    {
      self: `/api/credit-card-invoices/${invoice.id}`,
      plan: `/api/plans/${invoice.planId}`,
      card: `/api/credit-cards/${invoice.creditCardId}`,
    },
  )
}

const withCardName = (db: Database) =>
  db
    .select({ invoice: creditCardInvoices, creditCardName: creditCards.name, creditCardOwnerId: creditCards.userId })
    .from(creditCardInvoices)
    .innerJoin(creditCards, eq(creditCards.id, creditCardInvoices.creditCardId))

export async function findModel(db: Database, id: string) {
  const row = await withCardName(db).where(eq(creditCardInvoices.id, id)).get()
  if (!row) throw notFound("Fatura não encontrada")
  return invoiceModel(row.invoice, row.creditCardName, row.creditCardOwnerId)
}

export async function getAccessibleInvoice(db: Database, user: User, id: string): Promise<CreditCardInvoice> {
  const invoice = await db.query.creditCardInvoices.findFirst({ where: eq(creditCardInvoices.id, id) })
  if (!invoice) throw notFound("Fatura não encontrada")
  await requirePlanAccess(db, invoice.planId, user)
  return invoice
}

/** Faturas do plano, opcionalmente entre dois meses (AAAA-MM, inclusivo). */
export async function listByPlan(
  db: Database,
  user: User,
  planId: string,
  months: { from: string; to: string } | null,
) {
  await requirePlanAccess(db, planId, user)
  const rows = await withCardName(db)
    .where(
      and(
        eq(creditCardInvoices.planId, planId),
        months ? between(creditCardInvoices.referenceMonth, months.from, months.to) : undefined,
      ),
    )
    .orderBy(creditCardInvoices.referenceMonth, creditCards.name)
  return rows.map((r) => invoiceModel(r.invoice, r.creditCardName, r.creditCardOwnerId))
}

export async function assertCardInPlan(db: Database, planId: string, creditCardId: string) {
  const plan = await getPlanOrThrow(db, planId)
  const card = await db.query.creditCards.findFirst({ where: eq(creditCards.id, creditCardId) })
  if (!card) throw notFound("Cartão não encontrado")
  if (!(await participantIds(db, plan)).includes(card.userId)) {
    throw badRequest("O cartão precisa pertencer a um participante do plano.")
  }
}

/**
 * Assinaturas cobradas no cartão: no dia do vencimento (ou da cobrança, se não houver vencimento)
 * a cobrança entra na fatura do cartão naquele mês, se a fatura existir. Antes disso é uma conta
 * comum. Roda nas leituras (com a geração das cobranças) e ao criar uma fatura. Só mexe em
 * cobranças pendentes ainda sem fatura: um vínculo feito à mão (com outra fatura) fica como está.
 */
export function linkDueSubscriptionCharges(db: Database, planId: string) {
  const invoiceOfCharge = sql`(
    select i.id from credit_card_invoices i
    join subscriptions s on s.credit_card_id = i.credit_card_id
    where s.id = transactions.subscription_id
      and i.plan_id = transactions.plan_id
      and i.reference_month = transactions.subscription_month
  )`
  return db.run(sql`
    update transactions
    set credit_card_invoice_id = ${invoiceOfCharge}, is_cleared_by_invoice = 1
    where plan_id = ${planId}
      and credit_card_invoice_id is null
      and payment_status = 'PENDING'
      and subscription_id in (select id from subscriptions where plan_id = ${planId} and credit_card_id is not null)
      and coalesce(due_date, reference_date) <= ${currentDate()}
      and ${invoiceOfCharge} is not null
  `)
}

const duplicate = () => new ApiError(409, "Conflito", "Já existe uma fatura deste cartão neste mês para o plano.")

export async function create(db: Database, user: User, input: InvoiceInput & { planId: string }) {
  await requirePlanAccess(db, input.planId, user)
  await assertCardInPlan(db, input.planId, input.creditCardId)
  // Sem vencimento informado, vale o dia de vencimento do cartão (no mês seguinte ao da fatura).
  if (input.dueDate === undefined) {
    const card = await db.query.creditCards.findFirst({ where: eq(creditCards.id, input.creditCardId) })
    if (card?.dueDay) {
      input = { ...input, dueDate: dayOfMonth(addMonthsToYearMonth(input.referenceMonth, 1), card.dueDay) }
    }
  }
  try {
    const [invoice] = await db
      .insert(creditCardInvoices)
      .values({
        id: crypto.randomUUID(),
        planId: input.planId,
        creditCardId: input.creditCardId,
        referenceMonth: input.referenceMonth,
        amountCents: toCents(input.amount),
        ...paymentFields(input, null),
      })
      .returning()
    await linkDueSubscriptionCharges(db, invoice!.planId)
    return invoice!
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

/**
 * Vencimento e pagamento. Campo ausente mantém o valor atual (o PUT antigo, sem esses campos, não
 * apaga nada). A fatura pode ser paga com ou sem vencimento; a data de pagamento só vale para
 * fatura paga.
 */
function paymentFields(input: Partial<InvoiceInput>, current: CreditCardInvoice | null) {
  const has = (key: keyof InvoiceInput) => Object.prototype.hasOwnProperty.call(input, key)
  const dueDate = has("dueDate") ? (input.dueDate ?? null) : (current?.dueDate ?? null)
  const paymentStatus = has("paymentStatus") ? (input.paymentStatus ?? "PENDING") : (current?.paymentStatus ?? "PENDING")
  let paymentDate = has("paymentDate") ? (input.paymentDate ?? null) : (current?.paymentDate ?? null)
  if (paymentStatus !== "PAID") paymentDate = null
  return { dueDate, paymentStatus, paymentDate }
}

export async function update(db: Database, user: User, id: string, partial: Partial<InvoiceInput>) {
  const current = await getAccessibleInvoice(db, user, id)
  const input: InvoiceInput = {
    ...partial,
    creditCardId: partial.creditCardId ?? current.creditCardId,
    referenceMonth: partial.referenceMonth ?? current.referenceMonth,
    amount: partial.amount ?? fromCents(current.amountCents) ?? 0,
  }
  if (input.creditCardId !== current.creditCardId) {
    await assertCardInPlan(db, current.planId, input.creditCardId)
  }

  const updateInvoice = db
    .update(creditCardInvoices)
    .set({
      creditCardId: input.creditCardId,
      referenceMonth: input.referenceMonth,
      amountCents: toCents(input.amount),
      ...paymentFields(partial, current),
    })
    .where(eq(creditCardInvoices.id, id))

  try {
    if (input.referenceMonth === current.referenceMonth) {
      await updateInvoice
    } else {
      // Mudou o mês: as transações vinculadas vão junto, no mesmo batch (atômico).
      const offset = await maxOrderOutsideInvoice(db, current, input.referenceMonth)
      await db.batch([updateInvoice, moveLinkedTransactions(db, current, input.referenceMonth, offset)])
    }
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

// Maior ordem no mês de destino, sem contar as transações da própria fatura.
async function maxOrderOutsideInvoice(db: Database, invoice: CreditCardInvoice, month: string) {
  const { from, to } = monthBounds(month)
  const [row] = await db
    .select({ maxOrder: max(transactions.displayOrder) })
    .from(transactions)
    .where(
      and(
        eq(transactions.planId, invoice.planId),
        between(transactions.referenceDate, from, to),
        or(isNull(transactions.creditCardInvoiceId), ne(transactions.creditCardInvoiceId, invoice.id)),
      ),
    )
  return row?.maxOrder ?? 0
}

// Síncrona de propósito: devolve o builder para entrar no batch. (Uma função async
// resolveria o builder, que é "thenable", e executaria a query fora do batch.)
function moveLinkedTransactions(db: Database, invoice: CreditCardInvoice, month: string, offset: number) {
  // Entram no fim da ordem do mês de destino, mantendo a ordem relativa entre si.
  const [year, monthNumber] = month.split("-").map(Number) as [number, number]
  const lastDay = daysInMonth(year, monthNumber)

  return db
    .update(transactions)
    .set({
      referenceDate: sql`${month} || '-' || printf('%02d', min(cast(substr(${transactions.referenceDate}, 9, 2) as integer), ${lastDay}))`,
      displayOrder: sql`${offset} + coalesce(${transactions.displayOrder}, 0)`,
    })
    .where(eq(transactions.creditCardInvoiceId, invoice.id))
}

export async function remove(db: Database, user: User, id: string) {
  await getAccessibleInvoice(db, user, id)
  // Transações vinculadas ficam sem fatura (ON DELETE SET NULL) e deixam de contar como quitadas
  // por ela, senão sairiam dos totais sem fatura nenhuma cobrindo o valor.
  await db.batch([
    db.update(transactions).set({ clearedByInvoice: false }).where(eq(transactions.creditCardInvoiceId, id)),
    db.delete(creditCardInvoices).where(eq(creditCardInvoices.id, id)),
  ])
}
