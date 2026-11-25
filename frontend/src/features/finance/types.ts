import type { EntityModel } from "@/lib/api/types.ts"

export type TransactionType = "REVENUE" | "EXPENSE"
export type PaymentStatus = "PENDING" | "PAID"
export type BillingDocumentType = "LINK" | "FILE"

export type BillingDocument = {
  type: BillingDocumentType
  url?: string | null
  fileName?: string | null
  mimeType?: string | null
  downloadUrl?: string | null
  uploadedAt?: string | null
}

export type User = {
  id: string
  name: string
  email: string
  authProvider: "LOCAL" | "GOOGLE"
}

export type Plan = EntityModel<{
  id: string
  name: string
  ownerId: string
  partnerIds: string[]
}>

export type PlanParticipantRole = "OWNER" | "PARTNER"

export type PlanParticipant = {
  userId: string
  name: string
  email: string
  role: PlanParticipantRole
}

export type PlanInviteLink = {
  planId: string
  planName: string
  inviteToken: string | null
  active: boolean
}

export type PlanInvitation = {
  planId: string
  planName: string
  ownerId: string
  ownerName: string
  ownerEmail: string
  alreadyParticipant: boolean
  owner: boolean
}

// Mês de um plano. Não existe mais período no backend: os meses são gerados no cliente e as
// transações/faturas são buscadas por mês (`id` no formato AAAA-MM).
export type Period = {
  id: string
  planId: string
  month: number
  year: number
}

export type PlanMonthSummary = {
  month: string
  transactionCount: number
  totalRevenue: number
  totalExpense: number
  balance: number
}

export type TransactionCategory = EntityModel<{
  id: string
  name: string
}>

export type CreditCard = EntityModel<{
  id: string
  name: string
  userId: string
  /** Dia de vencimento das faturas (1–31); vale para todos os meses. */
  dueDay?: number | null
}>

export type Invoice = EntityModel<{
  id: string
  planId: string
  creditCardId: string
  creditCardName?: string | null
  /** Dono do cartão: a fatura conta para ele no filtro por responsável. */
  creditCardOwnerId?: string | null
  referenceMonth: string
  amount: number
  dueDate?: string | null
  paymentStatus?: PaymentStatus | null
  paymentDate?: string | null
}>

export type Transaction = EntityModel<{
  id: string
  description: string
  amount: number
  referenceDate: string
  createdAt?: string | null
  type: TransactionType
  category?: TransactionCategory | null
  planId: string
  responsibleUserId?: string | null
  order?: number | null
  recurringGroupId?: string | null
  /** Cobrança gerada por uma assinatura. */
  subscriptionId?: string | null
  creditCardInvoiceId?: string | null
  isClearedByInvoice?: boolean | null
  dueDate?: string | null
  paymentDate?: string | null
  paymentStatus?: PaymentStatus | null
  billingDocument?: BillingDocument | null
}>

export type SubscriptionChargeMode = "BILL" | "AUTO"

export type Subscription = EntityModel<{
  id: string
  planId: string
  name: string
  amount: number
  category?: { id: string; name: string | null } | null
  responsibleUserId?: string | null
  /** Dia da cobrança (1–31, limitado ao fim do mês). */
  billingDay: number
  /** BILL: gera vencimento ("Contas a pagar"). AUTO: débito automático/cartão. */
  chargeMode: SubscriptionChargeMode
  /** Cartão: cada cobrança entra na fatura do cartão no mesmo mês. */
  creditCardId?: string | null
  startMonth: string
  endMonth?: string | null
  active: boolean
  createdAt: string
}>

/** Previsão de gasto por categoria: meta do mês, comparada com as despesas reais da categoria. */
export type Forecast = EntityModel<{
  id: string
  planId: string
  category: { id: string; name: string | null }
  responsibleUserId?: string | null
  /** Com dia, aparece em "Contas a pagar" até a conta real ser lançada. */
  dueDay?: number | null
  startMonth: string
  endMonth?: string | null
  /** Valor vigente no mês atual. */
  amount: number
  /** Cada valor vale a partir de `fromMonth`. */
  amounts: Array<{ fromMonth: string; amount: number }>
}>

export type ShoppingItem = EntityModel<{
  id: string
  planId: string
  name: string
  /** Categoria do mercado; null = Outros. */
  category: string | null
  /** Marcado = tem em casa / já está no carrinho; desmarcado = precisa comprar. */
  checked: boolean
  note: string | null
  updatedAt: string
  /** Quem fez a última alteração. */
  updatedBy: string | null
}>

export type ShoppingItemPayload = {
  name?: string
  category?: string | null
  checked?: boolean
  note?: string | null
}

export type ForecastPayload = {
  category: { id?: string; name?: string }
  amount: number
  responsibleUserId?: string | null
  dueDay?: number | null
  startMonth?: string
  endMonth?: string | null
}

export type SubscriptionPayload = {
  name: string
  amount: number
  category: { id?: string; name?: string } | null
  responsibleUserId: string | null
  billingDay: number
  chargeMode: SubscriptionChargeMode
  creditCardId?: string | null
  startMonth: string
  endMonth: string | null
}

export type CategorySpending = {
  category: string
  totalAmount: number
}

export type ResponsibleOption = {
  id: string
  label: string
}

export type TransactionFormValues = {
  description: string
  amount: string
  type: TransactionType
  responsibleUserId: string
  categoryId: string
  categoryName: string
  isRecurring: boolean
  occurrences: number
  /** Despesa mensal sem fim: vira assinatura (cobrança gerada a cada mês). */
  isSubscription: boolean
  /** Cartão da assinatura ("" = sem cartão). */
  subscriptionCardId: string
  recurringGroupId?: string | null
  hasDueDate: boolean
  dueDate: string
  isPaid: boolean
  paymentDate: string
  billingDocumentType: BillingDocumentType | "NONE"
  billingDocumentUrl: string
  billingDocumentFile: File | null
  billingDocumentExisting: BillingDocument | null
}
