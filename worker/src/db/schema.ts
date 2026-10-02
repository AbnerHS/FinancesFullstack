import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

// Convenções (ver plano de migração):
// - IDs: UUID em texto (mesmo formato exposto pela API Java).
// - Dinheiro: inteiro em centavos (`*_cents`); converter na borda com lib/money.ts.
// - Datas: texto ISO-8601 (`YYYY-MM-DD` para datas, `YYYY-MM-DDTHH:mm:ss.sssZ` para instantes).
// - Não existe mais `financial_periods`: o mês vem de `transactions.reference_date`
//   e de `credit_card_invoices.reference_month`.

export const authProviders = ["LOCAL", "GOOGLE"] as const
export const transactionTypes = ["REVENUE", "EXPENSE"] as const
export const paymentStatuses = ["PENDING", "PAID"] as const
export const billingDocumentTypes = ["LINK", "FILE"] as const

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name"),
    authProvider: text("auth_provider", { enum: authProviders }).notNull().default("LOCAL"),
    googleSubject: text("google_subject").unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [check("chk_users_auth_provider", sql`${t.authProvider} in ('LOCAL', 'GOOGLE')`)],
)

export const financialPlans = sqliteTable(
  "financial_plans",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name"),
    activeInviteToken: text("active_invite_token").unique(),
  },
  (t) => [index("idx_financial_plans_owner").on(t.ownerId)],
)

export const financialPlanPartners = sqliteTable(
  "financial_plan_partners",
  {
    planId: text("plan_id")
      .notNull()
      .references(() => financialPlans.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.userId] }),
    index("idx_financial_plan_partners_user").on(t.userId),
  ],
)

export const transactionCategories = sqliteTable(
  "transaction_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
  },
  // Java usava findByNameIgnoreCase; a unicidade também ignora maiúsculas.
  (t) => [uniqueIndex("uk_transaction_categories_name").on(sql`lower(${t.name})`)],
)

export const creditCards = sqliteTable(
  "credit_cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name"),
  },
  (t) => [index("idx_credit_cards_user").on(t.userId)],
)

export const creditCardInvoices = sqliteTable(
  "credit_card_invoices",
  {
    id: text("id").primaryKey(),
    // Antes vinha de period.financialPlan; agora a fatura aponta direto para o plano.
    planId: text("plan_id")
      .notNull()
      .references(() => financialPlans.id, { onDelete: "cascade" }),
    creditCardId: text("credit_card_id")
      .notNull()
      .references(() => creditCards.id),
    referenceMonth: text("reference_month").notNull(), // 'YYYY-MM'
    amountCents: integer("amount_cents"),
  },
  (t) => [
    uniqueIndex("uk_credit_card_invoices_plan_card_month").on(
      t.planId,
      t.creditCardId,
      t.referenceMonth,
    ),
    index("idx_credit_card_invoices_card").on(t.creditCardId),
    check(
      "chk_credit_card_invoices_reference_month",
      sql`${t.referenceMonth} glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]'`,
    ),
  ],
)

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => financialPlans.id, { onDelete: "cascade" }),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    type: text("type", { enum: transactionTypes }).notNull(),
    // Data de competência: define em qual mês a transação aparece. Se vinculada a uma
    // fatura, fica dentro do reference_month da fatura.
    referenceDate: text("reference_date").notNull(), // 'YYYY-MM-DD'
    createdAt: text("created_at").notNull(),
    // Apagar a categoria só descategoriza as transações.
    categoryId: text("category_id").references(() => transactionCategories.id, { onDelete: "set null" }),
    responsibleUserId: text("responsible_user_id").references(() => users.id),
    recurringGroupId: text("recurring_group_id"),
    // Ordem manual dentro do (plano, mês da reference_date).
    displayOrder: integer("display_order"),
    creditCardInvoiceId: text("credit_card_invoice_id").references(() => creditCardInvoices.id, {
      onDelete: "set null",
    }),
    clearedByInvoice: integer("is_cleared_by_invoice", { mode: "boolean" }).notNull().default(false),
    dueDate: text("due_date"),
    paymentDate: text("payment_date"),
    paymentStatus: text("payment_status", { enum: paymentStatuses }).notNull().default("PENDING"),
    billingDocumentType: text("billing_document_type", { enum: billingDocumentTypes }),
    billingDocumentUrl: text("billing_document_url"),
    billingDocumentFileName: text("billing_document_file_name"),
    billingDocumentMimeType: text("billing_document_mime_type"),
    billingDocumentStorageKey: text("billing_document_storage_key"),
    billingDocumentUploadedAt: text("billing_document_uploaded_at"),
  },
  (t) => [
    index("idx_transactions_plan_reference_date").on(t.planId, t.referenceDate),
    index("idx_transactions_invoice").on(t.creditCardInvoiceId),
    index("idx_transactions_category").on(t.categoryId),
    index("idx_transactions_recurring_group").on(t.recurringGroupId),
    index("idx_transactions_storage_key").on(t.billingDocumentStorageKey),
    check("chk_transactions_type", sql`${t.type} in ('REVENUE', 'EXPENSE')`),
    check("chk_transactions_payment_status", sql`${t.paymentStatus} in ('PENDING', 'PAID')`),
    check(
      "chk_transactions_billing_document_type",
      sql`${t.billingDocumentType} is null or ${t.billingDocumentType} in ('LINK', 'FILE')`,
    ),
  ],
)

export type User = typeof users.$inferSelect
export type FinancialPlan = typeof financialPlans.$inferSelect
export type CreditCard = typeof creditCards.$inferSelect
export type CreditCardInvoice = typeof creditCardInvoices.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type TransactionCategory = typeof transactionCategories.$inferSelect
