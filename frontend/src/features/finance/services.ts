import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { http } from "@/lib/api/http.ts"
import { resolveLink } from "@/lib/api/hateoas.ts"
import type { EmbeddedCollection } from "@/lib/api/types.ts"
import type {
  CategorySpending,
  CreditCard,
  Invoice,
  Period,
  Plan,
  Transaction,
  TransactionCategory,
  User,
} from "@/features/finance/types.ts"

export const financeKeys = {
  plans: ["plans-me"] as const,
  periods: (planId?: string | null) => ["plan-periods", planId] as const,
  cards: ["credit-cards-me"] as const,
  categories: ["transaction-categories"] as const,
  users: ["users-all"] as const,
  userById: (id?: string | null) => ["user", id] as const,
  periodTransactionsRoot: ["period-transactions"] as const,
  periodTransactions: (periodId?: string | null) => ["period-transactions", periodId] as const,
  periodInvoices: (periodId?: string | null) => ["period-invoices", periodId] as const,
  categoryReport: (periodId?: string | null) =>
    ["report-spending-by-category", periodId] as const,
}

function embedded<T, Key extends string>(data: EmbeddedCollection<T, Key>, key: Key) {
  return data?._embedded?.[key] ?? []
}

export const planService = {
  async create(payload: { name: string; ownerId: string; partnerId: string | null }) {
    const { data } = await http.post<Plan>("/plans", payload)
    return data
  },
  async getMyPlans() {
    const { data } = await http.get<EmbeddedCollection<Plan, "plans">>("/users/me/plans")
    return embedded(data, "plans")
  },
  async update(id: string, payload: { name: string; ownerId: string; partnerId: string | null }) {
    const { data } = await http.put<Plan>(`/plans/${id}`, payload)
    return data
  },
  async getPeriodsByPlan(planOrPlanId: Plan | string | null | undefined) {
    const periodsPath =
      resolveLink(typeof planOrPlanId === "string" ? null : planOrPlanId?._links?.periods) ||
      (planOrPlanId ? `/plans/${typeof planOrPlanId === "string" ? planOrPlanId : planOrPlanId.id}/periods` : null)

    if (!periodsPath) {
      return []
    }

    const { data } = await http.get<EmbeddedCollection<Period, "periods">>(periodsPath)
    return embedded(data, "periods")
  },
}

export const periodService = {
  async create(payload: { month: number; year: number; financialPlanId: string }) {
    const { data } = await http.post<Period>("/periods", payload)
    return data
  },
  async getTransactionsByPeriod(periodOrPeriodId: Period | string | null | undefined) {
    const periodId = typeof periodOrPeriodId === "string" ? periodOrPeriodId : periodOrPeriodId?.id
    const transactionsPath =
      resolveLink(typeof periodOrPeriodId === "string" ? null : periodOrPeriodId?._links?.transactions) ||
      (periodId ? `/periods/${periodId}/transactions` : null)

    if (!transactionsPath) {
      return []
    }

    const { data } = await http.get<EmbeddedCollection<Transaction, "transactions">>(transactionsPath)
    return embedded(data, "transactions")
  },
  async getInvoicesByPeriod(periodOrPeriodId: Period | string | null | undefined) {
    const periodId = typeof periodOrPeriodId === "string" ? periodOrPeriodId : periodOrPeriodId?.id
    const invoicesPath =
      resolveLink(typeof periodOrPeriodId === "string" ? null : periodOrPeriodId?._links?.invoices) ||
      (periodId ? `/periods/${periodId}/invoices` : null)

    if (!invoicesPath) {
      return []
    }

    const { data } = await http.get<EmbeddedCollection<Invoice, "invoices">>(invoicesPath)
    return embedded(data, "invoices")
  },
}

export const creditCardService = {
  async getMyCreditCards() {
    const { data } = await http.get<EmbeddedCollection<CreditCard, "creditCards">>(
      "/users/me/credit-cards"
    )
    return embedded(data, "creditCards")
  },
  async create(payload: { name: string; userId: string }) {
    const { data } = await http.post<CreditCard>("/credit-cards", payload)
    return data
  },
  async update(id: string, payload: { name: string; userId: string }) {
    const { data } = await http.put<CreditCard>(`/credit-cards/${id}`, payload)
    return data
  },
}

export const invoiceService = {
  async create(payload: { creditCardId: string; periodId: string; amount: number }) {
    const { data } = await http.post<Invoice>("/credit-card-invoices", payload)
    return data
  },
}

export const transactionCategoryService = {
  async getAll() {
    const { data } = await http.get<
      EmbeddedCollection<TransactionCategory, "transactionCategories">
    >("/transaction-categories")
    return embedded(data, "transactionCategories")
  },
  async create(payload: { name: string }) {
    const { data } = await http.post<TransactionCategory>("/transaction-categories", payload)
    return data
  },
}

export const transactionService = {
  async create(payload: {
    description: string
    amount: number
    type: "REVENUE" | "EXPENSE"
    periodId: string
    responsibleUserId?: string | null
    category?: { id: string } | null
  }) {
    const { data } = await http.post<Transaction>("/transactions", payload)
    return data
  },
  async createRecurring(payload: {
    transaction: {
      description: string
      amount: number
      type: "REVENUE" | "EXPENSE"
      periodId: string
      responsibleUserId?: string | null
      category?: { id: string } | null
    }
    numberOfPeriods: number
  }) {
    const { data } = await http.post<Transaction[]>("/transactions/recurring", payload)
    return data
  },
  async updatePartial(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch<Transaction>(`/transactions/${id}`, payload)
    return data
  },
  async delete(id: string) {
    await http.delete(`/transactions/${id}`)
  },
}

export const userService = {
  async getMe() {
    const { data } = await http.get<User>("/users/me")
    return data
  },
  async getAll() {
    const { data } = await http.get<EmbeddedCollection<User, "users">>("/users")
    return embedded(data, "users")
  },
  async getById(id?: string | null) {
    if (!id) {
      return null
    }

    const { data } = await http.get<User>(`/users/${id}`)
    return data
  },
  async updateMe(payload: { name: string; email: string }) {
    const { data } = await http.patch<User>("/users/me", payload)
    return data
  },
  async updatePassword(payload: { currentPassword: string; newPassword: string }) {
    await http.put("/users/me/password", payload)
  },
}

export const reportService = {
  async getSpendingByCategory(periodId?: string | null) {
    if (!periodId) {
      return []
    }

    const { data } = await http.get<CategorySpending[]>("/reports/spending-by-category", {
      params: { periodId },
    })

    return data ?? []
  },
}

export const financeQueries = {
  plans: () =>
    queryOptions({
      queryKey: financeKeys.plans,
      queryFn: planService.getMyPlans,
      staleTime: 1000 * 60 * 5,
    }),
  periods: (plan: Plan | null) =>
    queryOptions({
      queryKey: financeKeys.periods(plan?.id),
      queryFn: () => planService.getPeriodsByPlan(plan),
      enabled: Boolean(plan),
      staleTime: 1000 * 60 * 5,
      placeholderData: keepPreviousData,
    }),
  cards: () =>
    queryOptions({
      queryKey: financeKeys.cards,
      queryFn: creditCardService.getMyCreditCards,
      staleTime: 1000 * 60 * 10,
    }),
  categories: () =>
    queryOptions({
      queryKey: financeKeys.categories,
      queryFn: transactionCategoryService.getAll,
      staleTime: 1000 * 60 * 10,
    }),
}
