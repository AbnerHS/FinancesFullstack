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
  partnerId: string | null
}>

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
