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
    // Dia de vencimento das faturas (1–31, limitado ao fim do mês); null = sem vencimento padrão.
    dueDay: integer("due_day"),
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
    // Opcionais: com vencimento, a fatura entra em "Contas a pagar" como as despesas.
    dueDate: text("due_date"), // 'YYYY-MM-DD'
    paymentStatus: text("payment_status", { enum: paymentStatuses }).notNull().default("PENDING"),
    paymentDate: text("payment_date"),
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

export const subscriptionChargeModes = ["BILL", "AUTO"] as const

/**
 * Assinatura: conta mensal sem fim fixo. As transações de cada mês são geradas sob demanda
 * (services/subscriptions.ts) até `generated_through`, que só avança; apagar uma cobrança gerada
 * não a recria.
 */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => financialPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    categoryId: text("category_id").references(() => transactionCategories.id, { onDelete: "set null" }),
    responsibleUserId: text("responsible_user_id").references(() => users.id),
    // Dia da cobrança (1–31, limitado ao fim do mês).
    billingDay: integer("billing_day").notNull(),
    // BILL: gera vencimento (entra em "Contas a pagar"). AUTO: débito automático/cartão, sem vencimento.
    chargeMode: text("charge_mode", { enum: subscriptionChargeModes }).notNull(),
    // Cartão: cada cobrança entra na fatura do cartão no mesmo mês (quando a fatura existe).
    creditCardId: text("credit_card_id").references(() => creditCards.id, { onDelete: "set null" }),
    startMonth: text("start_month").notNull(), // 'YYYY-MM'
    endMonth: text("end_month"), // último mês cobrado; null = ativa
    generatedThrough: text("generated_through"), // último mês já gerado
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_subscriptions_plan").on(t.planId),
    check("chk_subscriptions_billing_day", sql`${t.billingDay} between 1 and 31`),
    check("chk_subscriptions_charge_mode", sql`${t.chargeMode} in ('BILL', 'AUTO')`),
  ],
)

/**
 * Previsão de gasto por categoria (ex.: Combustível R$ 250/mês). Não gera transações: o gasto real
 * é a soma das despesas da categoria no mês, e o que falta para a previsão conta como gasto
 * previsto nos meses que ainda não fecharam. Uma previsão por categoria no plano.
 */
export const forecasts = sqliteTable(
  "forecasts",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => financialPlans.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => transactionCategories.id, { onDelete: "cascade" }),
    responsibleUserId: text("responsible_user_id").references(() => users.id),
    // Com dia, a previsão aparece em "Contas a pagar" até a conta real ser lançada.
    dueDay: integer("due_day"),
    startMonth: text("start_month").notNull(), // 'YYYY-MM'
    endMonth: text("end_month"), // último mês previsto; null = sem fim
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uk_forecasts_plan_category").on(t.planId, t.categoryId),
    check("chk_forecasts_due_day", sql`${t.dueDay} is null or ${t.dueDay} between 1 and 31`),
  ],
)

/** Valor da previsão a partir de um mês: mudar o valor vale dali em diante; os meses antes guardam o antigo. */
export const forecastAmounts = sqliteTable(
  "forecast_amounts",
  {
    forecastId: text("forecast_id")
      .notNull()
      .references(() => forecasts.id, { onDelete: "cascade" }),
    fromMonth: text("from_month").notNull(), // 'YYYY-MM'
    amountCents: integer("amount_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.forecastId, t.fromMonth] })],
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
    // Cobrança gerada por uma assinatura, e o mês dela (a geração não duplica o mês).
    subscriptionId: text("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
    subscriptionMonth: text("subscription_month"),
  },
  (t) => [
    uniqueIndex("uk_transactions_subscription_month").on(t.subscriptionId, t.subscriptionMonth),
    index("idx_transactions_plan_reference_date").on(t.planId, t.referenceDate),
    // Resumo da semana: vencimentos por plano.
    index("idx_transactions_plan_due_date").on(t.planId, t.dueDate),
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

/**
 * Lista de compras do plano: os produtos de sempre ficam cadastrados. Marcado = tem em casa (ou já
 * foi comprado); desmarcado = precisa comprar.
 */
export const shoppingItems = sqliteTable(
  "shopping_items",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => financialPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Categoria do mercado (Hortifruti, Limpeza...), para agrupar a lista. null = sem categoria.
    category: text("category"),
    checked: integer("is_checked", { mode: "boolean" }).notNull().default(true),
    // Observação do que falta (ex.: "2 kg", "a marca X"); só faz sentido enquanto desmarcado.
    note: text("note"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    // Quem fez a última alteração: a outra tela avisa "Ana marcou Leite".
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("uk_shopping_items_plan_name").on(t.planId, sql`lower(name)`)],
)

export type User = typeof users.$inferSelect
export type FinancialPlan = typeof financialPlans.$inferSelect
export type CreditCard = typeof creditCards.$inferSelect
export type CreditCardInvoice = typeof creditCardInvoices.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Forecast = typeof forecasts.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type TransactionCategory = typeof transactionCategories.$inferSelect
export type ShoppingItem = typeof shoppingItems.$inferSelect
