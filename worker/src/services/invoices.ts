import { and, between, eq, max, ne, or, isNull, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type CreditCardInvoice, creditCardInvoices, creditCards, transactions, type User } from "../db/schema.ts"
import { daysInMonth, monthBounds } from "../lib/dates.ts"
import { ApiError, badRequest, notFound } from "../lib/errors.ts"
import { isUniqueViolation } from "../lib/db-errors.ts"
import { withLinks } from "../lib/hal.ts"
import { fromCents, toCents } from "../lib/money.ts"
import { getPlanOrThrow, participantIds, requirePlanAccess } from "./access.ts"

// Porta do CreditCardInvoiceService. A fatura pertence a um plano e a um mês (`referenceMonth`);
// as transações vinculadas ficam com a data de competência dentro desse mês.

export type InvoiceInput = { creditCardId: string; referenceMonth: string; amount: number }

export function invoiceModel(invoice: CreditCardInvoice, creditCardName: string | null) {
  return withLinks(
    {
      id: invoice.id,
      planId: invoice.planId,
      creditCardId: invoice.creditCardId,
      creditCardName,
      referenceMonth: invoice.referenceMonth,
      amount: fromCents(invoice.amountCents),
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
    .select({ invoice: creditCardInvoices, creditCardName: creditCards.name })
    .from(creditCardInvoices)
    .innerJoin(creditCards, eq(creditCards.id, creditCardInvoices.creditCardId))

export async function findModel(db: Database, id: string) {
  const row = await withCardName(db).where(eq(creditCardInvoices.id, id)).get()
  if (!row) throw notFound("Fatura não encontrada")
  return invoiceModel(row.invoice, row.creditCardName)
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
  return rows.map((r) => invoiceModel(r.invoice, r.creditCardName))
}

async function assertCardInPlan(db: Database, planId: string, creditCardId: string) {
  const plan = await getPlanOrThrow(db, planId)
  const card = await db.query.creditCards.findFirst({ where: eq(creditCards.id, creditCardId) })
  if (!card) throw notFound("Cartão não encontrado")
  if (!(await participantIds(db, plan)).includes(card.userId)) {
    throw badRequest("O cartão precisa pertencer a um participante do plano.")
  }
}

const duplicate = () => new ApiError(409, "Conflito", "Já existe uma fatura deste cartão neste mês para o plano.")

export async function create(db: Database, user: User, input: InvoiceInput & { planId: string }) {
  await requirePlanAccess(db, input.planId, user)
  await assertCardInPlan(db, input.planId, input.creditCardId)
  try {
    const [invoice] = await db
      .insert(creditCardInvoices)
      .values({
        id: crypto.randomUUID(),
        planId: input.planId,
        creditCardId: input.creditCardId,
        referenceMonth: input.referenceMonth,
        amountCents: toCents(input.amount),
      })
      .returning()
    return invoice!
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

export async function update(db: Database, user: User, id: string, input: InvoiceInput) {
  const current = await getAccessibleInvoice(db, user, id)
  if (input.creditCardId !== current.creditCardId) {
    await assertCardInPlan(db, current.planId, input.creditCardId)
  }

  const updateInvoice = db
    .update(creditCardInvoices)
    .set({ creditCardId: input.creditCardId, referenceMonth: input.referenceMonth, amountCents: toCents(input.amount) })
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
  // Transações vinculadas ficam sem fatura (ON DELETE SET NULL).
  await db.delete(creditCardInvoices).where(eq(creditCardInvoices.id, id))
}
