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
  startMonth: string
  endMonth?: string | null
  active: boolean
  createdAt: string
}>

export type RecurringGroupSummary = {
  recurringGroupId: string
  description: string
  amount: number
  occurrences: number
  firstMonth: string
  lastMonth: string
}

export type SubscriptionPayload = {
  name: string
  amount: number
  category: { id?: string; name?: string } | null
  responsibleUserId: string | null
  billingDay: number
  chargeMode: SubscriptionChargeMode
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
