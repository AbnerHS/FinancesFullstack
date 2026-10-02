import { and, asc, between, count, eq, inArray, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import {
  type CreditCardInvoice,
  creditCardInvoices,
  type FinancialPlan,
  type Transaction,
  transactionCategories,
  transactions,
  type User,
} from "../db/schema.ts"
import { addMonths, monthBounds, moveToMonth, toYearMonth } from "../lib/dates.ts"
import { badRequest, notFound } from "../lib/errors.ts"
import { withLinks } from "../lib/hal.ts"
import { fromCents, toCents } from "../lib/money.ts"
import type { DateRange } from "../lib/query.ts"
import { isParticipant, requirePlanAccess } from "./access.ts"
import * as categories from "./categories.ts"
import { cleanupUnusedDocuments } from "./documents.ts"

// Porta do TransactionService, sem períodos: o mês vem de `referenceDate` e a ordem manual
// (`order`) vale dentro do (plano, mês).

export type TransactionInput = {
  description?: string
  amount?: number
  type?: "REVENUE" | "EXPENSE"
  referenceDate?: string
  responsibleUserId?: string | null
  category?: { id?: string | null; name?: string | null } | null
  creditCardInvoiceId?: string | null
  isClearedByInvoice?: boolean | null
  dueDate?: string | null
  paymentDate?: string | null
  paymentStatus?: "PENDING" | "PAID" | null
  billingDocument?: { type: "LINK" | "FILE"; url?: string | null } | null
  order?: number | null
}

type Ctx = { env: Env; db: Database; user: User }

// Campos graváveis (sem id, planId, createdAt, displayOrder).
type Draft = Omit<Transaction, "id" | "planId" | "createdAt" | "displayOrder">

const EMPTY_DOCUMENT = {
  billingDocumentType: null,
  billingDocumentUrl: null,
  billingDocumentFileName: null,
  billingDocumentMimeType: null,
  billingDocumentStorageKey: null,
  billingDocumentUploadedAt: null,
} as const

// ---------------------------------------------------------------------------------------------
// Leitura

const selectWithCategory = (db: Database) =>
  db
    .select({ transaction: transactions, category: transactionCategories })
    .from(transactions)
    .leftJoin(transactionCategories, eq(transactionCategories.id, transactions.categoryId))

type Row = Awaited<ReturnType<ReturnType<typeof selectWithCategory>["all"]>>[number]

export function transactionModel({ transaction: t, category }: Row) {
  return withLinks(
    {
      id: t.id,
      planId: t.planId,
      description: t.description,
      amount: fromCents(t.amountCents),
      referenceDate: t.referenceDate,
      createdAt: t.createdAt,
      type: t.type,
      category: category ? { id: category.id, name: category.name } : null,
      responsibleUserId: t.responsibleUserId,
      order: t.displayOrder,
      recurringGroupId: t.recurringGroupId,
      creditCardInvoiceId: t.creditCardInvoiceId,
      isClearedByInvoice: t.clearedByInvoice,
      dueDate: t.dueDate,
      paymentDate: t.paymentDate,
      paymentStatus: t.paymentStatus,
      billingDocument: t.billingDocumentType
        ? {
            type: t.billingDocumentType,
            url: t.billingDocumentUrl,
            fileName: t.billingDocumentFileName,
            mimeType: t.billingDocumentMimeType,
            downloadUrl:
              t.billingDocumentType === "FILE" ? `/api/transactions/${t.id}/billing-document/download` : null,
            uploadedAt: t.billingDocumentUploadedAt,
          }
        : null,
    },
    {
      self: `/api/transactions/${t.id}`,
      plan: `/api/plans/${t.planId}`,
      invoice: t.creditCardInvoiceId && `/api/credit-card-invoices/${t.creditCardInvoiceId}`,
    },
  )
}

export async function findModel(db: Database, id: string) {
  const row = await selectWithCategory(db).where(eq(transactions.id, id)).get()
  if (!row) throw notFound("Transação não encontrada")
  return transactionModel(row)
}

async function findModels(db: Database, ids: string[]) {
  const rows = await selectWithCategory(db).where(inArray(transactions.id, ids))
  const byId = new Map(rows.map((r) => [r.transaction.id, r]))
  return ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [transactionModel(row)] : []
  })
}

export async function getAccessibleTransaction(db: Database, user: User, id: string): Promise<Transaction> {
  const transaction = await db.query.transactions.findFirst({ where: eq(transactions.id, id) })
  if (!transaction) throw notFound("Transação não encontrada")
  await requirePlanAccess(db, transaction.planId, user)
  return transaction
}

/**
 * Transações do plano por mês e depois pela ordem manual. Filtra por intervalo e/ou por grupo de
 * recorrência (usado para editar/excluir todas as ocorrências); ao menos um dos dois é exigido na rota.
 */
export async function listByPlan(
  db: Database,
  user: User,
  planId: string,
  filter: { range: DateRange | null; recurringGroupId?: string | undefined },
) {
  await requirePlanAccess(db, planId, user)
  const { range, recurringGroupId } = filter
  const rows = await selectWithCategory(db)
    .where(
      and(
        eq(transactions.planId, planId),
        range ? between(transactions.referenceDate, range.from, range.to) : undefined,
        recurringGroupId ? eq(transactions.recurringGroupId, recurringGroupId) : undefined,
      ),
    )
    .orderBy(
      sql`substr(${transactions.referenceDate}, 1, 7)`,
      sql`${transactions.displayOrder} is null`,
      asc(transactions.displayOrder),
      asc(transactions.createdAt),
    )
  return rows.map(transactionModel)
}

// ---------------------------------------------------------------------------------------------
// Escrita

/** Próxima posição no fim do (plano, mês). Subquery para ser calculada no próprio INSERT/UPDATE. */
function nextOrder(planId: string, referenceDate: string) {
  const { from, to } = monthBounds(toYearMonth(referenceDate))
  return sql`(select coalesce(max(${transactions.displayOrder}), 0) + 1 from ${transactions}
              where ${transactions.planId} = ${planId}
                and ${transactions.referenceDate} between ${from} and ${to})`
}

function defaults(): Draft {
  return {
    description: null,
    amountCents: 0,
    type: "EXPENSE",
    referenceDate: "",
    categoryId: null,
    responsibleUserId: null,
    recurringGroupId: null,
    creditCardInvoiceId: null,
    clearedByInvoice: false,
    dueDate: null,
    paymentDate: null,
    paymentStatus: "PENDING",
    ...EMPTY_DOCUMENT,
  }
}

const draftOf = ({ id, planId, createdAt, displayOrder, ...draft }: Transaction): Draft => draft

async function findInvoice(db: Database, id: string): Promise<CreditCardInvoice> {
  const invoice = await db.query.creditCardInvoices.findFirst({ where: eq(creditCardInvoices.id, id) })
  if (!invoice) throw notFound("Fatura de cartão não encontrada!")
  return invoice
}

/**
 * Aplica `input` sobre a transação atual (ou valores padrão) e valida as regras de negócio.
 * Só os campos presentes em `input` mudam (semântica de PATCH); create/PUT normalizam antes.
 */
async function applyInput(
  ctx: Ctx,
  plan: FinancialPlan,
  existing: Transaction | null,
  input: TransactionInput,
): Promise<{ draft: Draft; orderChange: number | "append" | null }> {
  const draft = existing ? draftOf(existing) : defaults()
  const has = (key: keyof TransactionInput) => key in input

  if (has("description")) {
    const description = input.description?.trim()
    if (!description) throw badRequest("A descrição é obrigatória")
    draft.description = description
  }
  if (input.amount !== undefined) draft.amountCents = toCents(input.amount)
  if (input.type !== undefined) draft.type = input.type
  if (input.referenceDate !== undefined) draft.referenceDate = input.referenceDate
  if (has("isClearedByInvoice")) draft.clearedByInvoice = input.isClearedByInvoice ?? false
  if (has("dueDate")) draft.dueDate = input.dueDate ?? null
  if (has("paymentDate")) draft.paymentDate = input.paymentDate ?? null
  if (has("paymentStatus")) draft.paymentStatus = input.paymentStatus ?? "PENDING"
  if (has("category")) draft.categoryId = await categories.resolve(ctx.db, input.category)

  if (has("responsibleUserId")) {
    const responsible = input.responsibleUserId ?? null
    if (responsible && !(await isParticipant(ctx.db, plan.id, responsible))) {
      throw badRequest("O responsável precisa participar do plano.")
    }
    draft.responsibleUserId = responsible
  }

  // Fatura: a data de competência acompanha o mês da fatura.
  const invoiceChanged = has("creditCardInvoiceId") && (input.creditCardInvoiceId ?? null) !== draft.creditCardInvoiceId
  if (has("creditCardInvoiceId")) draft.creditCardInvoiceId = input.creditCardInvoiceId ?? null
  if (draft.creditCardInvoiceId) {
    const invoice = await findInvoice(ctx.db, draft.creditCardInvoiceId)
    if (invoice.planId !== plan.id) throw badRequest("A fatura pertence a outro plano.")

    if (toYearMonth(draft.referenceDate) !== invoice.referenceMonth) {
      if (invoiceChanged || !existing) {
        draft.referenceDate = moveToMonth(draft.referenceDate, invoice.referenceMonth)
      } else {
        throw badRequest(
          `A data de competência precisa estar no mês da fatura (${invoice.referenceMonth}). Desvincule a fatura para mudar o mês.`,
        )
      }
    }
  }

  if (has("billingDocument")) {
    applyLinkDocument(draft, input.billingDocument ?? null, !!existing?.billingDocumentType)
  }

  const monthChanged = !existing || toYearMonth(existing.referenceDate) !== toYearMonth(draft.referenceDate)
  const orderChange = input.order != null ? input.order : monthChanged ? "append" : null
  return { draft, orderChange }
}

function applyLinkDocument(
  draft: Draft,
  document: TransactionInput["billingDocument"] | null,
  hadExistingDocument: boolean,
) {
  if (!document) {
    Object.assign(draft, EMPTY_DOCUMENT)
    return
  }
  if (document.type !== "LINK") {
    throw badRequest("Documentos do tipo arquivo devem ser enviados pelo endpoint de upload.")
  }
  assertCanAttachDocument(hadExistingDocument, draft.dueDate)
  const url = document.url?.trim()
  if (!url) throw badRequest("Informe um link válido para o documento.")
  Object.assign(draft, EMPTY_DOCUMENT, { billingDocumentType: "LINK", billingDocumentUrl: url })
}

export function assertCanAttachDocument(hadExistingDocument: boolean, dueDate: string | null) {
  if (!hadExistingDocument && !dueDate) {
    throw badRequest("Somente transações com vencimento podem receber documento para pagamento.")
  }
}

// PUT substitui tudo, como o mapper do Java: campos opcionais ausentes viram null.
// Exceção: `billingDocument` ausente mantém o documento atual (no Java, um PUT sem ele apagava
// até arquivos enviados).
function asReplacement(input: TransactionInput): TransactionInput {
  return {
    responsibleUserId: null,
    category: null,
    creditCardInvoiceId: null,
    isClearedByInvoice: null,
    dueDate: null,
    paymentDate: null,
    paymentStatus: null,
    ...input,
  }
}

export async function create(ctx: Ctx, input: TransactionInput & { planId: string }) {
  const plan = await requirePlanAccess(ctx.db, input.planId, ctx.user)
  const { draft, orderChange } = await applyInput(ctx, plan, null, asReplacement(input))
  const [created] = await ctx.db
    .insert(transactions)
    .values({
      ...draft,
      id: crypto.randomUUID(),
      planId: plan.id,
      createdAt: new Date().toISOString(),
      displayOrder: typeof orderChange === "number" ? orderChange : nextOrder(plan.id, draft.referenceDate),
    })
    .returning()
  return findModel(ctx.db, created!.id)
}

export const MAX_OCCURRENCES = 120

export async function createRecurring(
  ctx: Ctx,
  input: { transaction: TransactionInput & { planId: string }; occurrences: number },
) {
  if (input.transaction.creditCardInvoiceId) {
    throw badRequest("Transações recorrentes não podem ser vinculadas a uma fatura.")
  }
  const plan = await requirePlanAccess(ctx.db, input.transaction.planId, ctx.user)
  const { draft } = await applyInput(ctx, plan, null, asReplacement(input.transaction))
  const recurringGroupId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const ids: string[] = []

  const inserts = Array.from({ length: input.occurrences }, (_, i) => {
    const id = crypto.randomUUID()
    ids.push(id)
    const referenceDate = addMonths(draft.referenceDate, i)
    return ctx.db.insert(transactions).values({
      ...draft,
      id,
      planId: plan.id,
      createdAt,
      recurringGroupId,
      referenceDate,
      // Mantém a distância entre vencimento e competência (ex.: competência em out, vence em nov).
      dueDate: draft.dueDate && addMonths(draft.dueDate, i),
      // Só a primeira ocorrência herda o pagamento (applyRecurringDates do Java).
      ...(i > 0 && { paymentDate: null, paymentStatus: "PENDING" as const }),
      displayOrder: nextOrder(plan.id, referenceDate),
    })
  })

  // Um batch só: ou cria todas as ocorrências, ou nenhuma.
  await ctx.db.batch(inserts as [(typeof inserts)[number], ...typeof inserts])
  return findModels(ctx.db, ids)
}

export async function update(ctx: Ctx, id: string, input: TransactionInput, mode: "put" | "patch") {
  const existing = await getAccessibleTransaction(ctx.db, ctx.user, id)
  const plan = await requirePlanAccess(ctx.db, existing.planId, ctx.user)
  const { draft, orderChange } = await applyInput(ctx, plan, existing, mode === "put" ? asReplacement(input) : input)

  await ctx.db
    .update(transactions)
    .set({
      ...draft,
      ...(orderChange !== null && {
        displayOrder: orderChange === "append" ? nextOrder(plan.id, draft.referenceDate) : orderChange,
      }),
    })
    .where(eq(transactions.id, id))

  if (existing.billingDocumentStorageKey !== draft.billingDocumentStorageKey) {
    await cleanupUnusedDocuments(ctx.env, ctx.db, [existing.billingDocumentStorageKey])
  }
  return findModel(ctx.db, id)
}

export async function remove(ctx: Ctx, id: string) {
  const existing = await getAccessibleTransaction(ctx.db, ctx.user, id)
  await ctx.db.delete(transactions).where(eq(transactions.id, id))
  await cleanupUnusedDocuments(ctx.env, ctx.db, [existing.billingDocumentStorageKey])
}

/** Novo: grava a ordem do mês inteiro de uma vez (o frontend fazia um PATCH por transação). */
export async function reorder(ctx: Ctx, planId: string, month: string, transactionIds: string[]) {
  await requirePlanAccess(ctx.db, planId, ctx.user)
  if (new Set(transactionIds).size !== transactionIds.length) {
    throw badRequest("A lista de transações contém itens repetidos.")
  }

  const { from, to } = monthBounds(month)
  const [row] = await ctx.db
    .select({ n: count() })
    .from(transactions)
    .where(
      and(
        inArray(transactions.id, transactionIds),
        eq(transactions.planId, planId),
        between(transactions.referenceDate, from, to),
      ),
    )
  if (row?.n !== transactionIds.length) {
    throw badRequest(`Todas as transações precisam ser do plano e do mês ${month}.`)
  }

  const updates = transactionIds.map((id, index) =>
    ctx.db.update(transactions).set({ displayOrder: index + 1 }).where(eq(transactions.id, id)),
  )
  if (updates.length > 0) {
    await ctx.db.batch(updates as [(typeof updates)[number], ...typeof updates])
  }
}

// ---------------------------------------------------------------------------------------------
// Agregações

const revenue = sql<number>`coalesce(sum(case when ${transactions.type} = 'REVENUE' then ${transactions.amountCents} else 0 end), 0)`
const expense = sql<number>`coalesce(sum(case when ${transactions.type} = 'EXPENSE' then ${transactions.amountCents} else 0 end), 0)`

const toSummary = (r: { revenue: number; expense: number }) => ({
  totalRevenue: fromCents(r.revenue),
  totalExpense: fromCents(r.expense),
  balance: fromCents(r.revenue - r.expense),
})

/** Equivale ao getSummaryByPlanId/getSummaryByPeriodId do Java, com intervalo opcional. */
export async function summary(db: Database, user: User, planId: string, range: DateRange | null) {
  await requirePlanAccess(db, planId, user)
  const [row] = await db
    .select({ revenue, expense })
    .from(transactions)
    .where(
      and(
        eq(transactions.planId, planId),
        range ? between(transactions.referenceDate, range.from, range.to) : undefined,
      ),
    )
  return toSummary(row ?? { revenue: 0, expense: 0 })
}

/** Substitui a lista de períodos: meses que têm transações, com os totais de cada um. */
export async function months(db: Database, user: User, planId: string) {
  await requirePlanAccess(db, planId, user)
  const month = sql<string>`substr(${transactions.referenceDate}, 1, 7)`
  const rows = await db
    .select({ month, transactionCount: count(), revenue, expense })
    .from(transactions)
    .where(eq(transactions.planId, planId))
    .groupBy(month)
    .orderBy(month)
  return rows.map(({ month, transactionCount, ...totals }) => ({ month, transactionCount, ...toSummary(totals) }))
}

/** ReportService.getSpendingByCategory, agora por plano e intervalo. */
export async function spendingByCategory(db: Database, user: User, planId: string, range: DateRange | null) {
  await requirePlanAccess(db, planId, user)
  const total = sql<number>`sum(${transactions.amountCents})`
  const rows = await db
    .select({ category: transactionCategories.name, total })
    .from(transactions)
    .leftJoin(transactionCategories, eq(transactionCategories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.planId, planId),
        eq(transactions.type, "EXPENSE"),
        range ? between(transactions.referenceDate, range.from, range.to) : undefined,
      ),
    )
    .groupBy(transactionCategories.name)
    .orderBy(sql`${total} desc`)
  return rows.map((r) => ({ category: r.category, totalAmount: fromCents(r.total) }))
}
