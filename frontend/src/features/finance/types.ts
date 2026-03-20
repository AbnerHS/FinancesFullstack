import type { EntityModel } from "@/lib/api/types.ts"

export type TransactionType = "REVENUE" | "EXPENSE"

export type User = {
  id: string
  name: string
  email: string
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

export type Period = EntityModel<{
  id: string
  month: number
  year: number
  monthlyBalance?: number | null
  financialPlanId: string
}>

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
  creditCardId: string
  creditCardName?: string | null
  periodId: string
  amount: number | string
}>

export type Transaction = EntityModel<{
  id: string
  description: string
  amount: number | string
  dateTime?: string | null
  type: TransactionType
  category?: TransactionCategory | null
  periodId: string
  responsibleUserId?: string | null
  order?: number | null
  recurringGroupId?: string | null
  creditCardInvoiceId?: string | null
  isClearedByInvoice?: boolean | null
}>

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
  periodId: string
  responsibleUserId: string
  categoryId: string
  categoryName: string
  isRecurring: boolean
  numberOfPeriods: number
  recurringGroupId?: string | null
}
