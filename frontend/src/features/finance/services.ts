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
  PlanInvitation,
  PlanInviteLink,
  PlanParticipant,
  Transaction,
  TransactionCategory,
  User,
} from "@/features/finance/types.ts"

export const financeKeys = {
  plans: ["plans-me"] as const,
  periods: (planId?: string | null) => ["plan-periods", planId] as const,
  participants: (planId?: string | null) =>
    ["plan-participants", planId] as const,
  inviteLink: (planId?: string | null) => ["plan-invite-link", planId] as const,
  invitation: (token?: string | null) => ["plan-invitation", token] as const,
  cards: ["credit-cards"] as const,
  ownCards: ["credit-cards", "me"] as const,
  planCards: (planId?: string | null) =>
    ["credit-cards", "plan", planId] as const,
  categories: ["transaction-categories"] as const,
  users: ["users-all"] as const,
  periodTransactionsRoot: ["period-transactions"] as const,
  periodTransactions: (periodId?: string | null) =>
    ["period-transactions", periodId] as const,
  periodInvoices: (periodId?: string | null) =>
    ["period-invoices", periodId] as const,
  categoryReport: (periodId?: string | null) =>
    ["report-spending-by-category", periodId] as const,
}

function embedded<T, Key extends string>(
  data: EmbeddedCollection<T, Key>,
  key: Key
) {
  return data?._embedded?.[key] ?? []
}

export const planService = {
  async create(payload: { name: string }) {
    const { data } = await http.post<Plan>("/plans", payload)
    return data
  },
  async getMyPlans() {
    const { data } =
      await http.get<EmbeddedCollection<Plan, "plans">>("/users/me/plans")
    return embedded(data, "plans")
  },
  async update(id: string, payload: { name: string }) {
    const { data } = await http.put<Plan>(`/plans/${id}`, payload)
    return data
  },
  async delete(id: string) {
    await http.delete(`/plans/${id}`)
  },
  async getPeriodsByPlan(planOrPlanId: Plan | string | null | undefined) {
    const periodsPath =
      resolveLink(
        typeof planOrPlanId === "string" ? null : planOrPlanId?._links?.periods
      ) ||
      (planOrPlanId
        ? `/plans/${typeof planOrPlanId === "string" ? planOrPlanId : planOrPlanId.id}/periods`
        : null)

    if (!periodsPath) {
      return []
    }

    const { data } =
      await http.get<EmbeddedCollection<Period, "periods">>(periodsPath)
    return embedded(data, "periods")
  },
  async getParticipants(planId?: string | null) {
    if (!planId) {
      return []
    }

    const { data } = await http.get<PlanParticipant[]>(
      `/plans/${planId}/participants`
    )
    return data ?? []
  },
  async getCreditCards(planId?: string | null) {
    if (!planId) {
      return []
    }

    const { data } = await http.get<
      EmbeddedCollection<CreditCard, "creditCards">
    >(`/plans/${planId}/credit-cards`)
    return embedded(data, "creditCards")
  },
  async getInviteLink(planId?: string | null) {
    if (!planId) {
      return null
    }

    const { data } = await http.get<PlanInviteLink>(
      `/plans/${planId}/invite-link`
    )
    return data
  },
  async rotateInviteLink(planId: string) {
    const { data } = await http.put<PlanInviteLink>(
      `/plans/${planId}/invite-link`
    )
    return data
  },
  async revokeInviteLink(planId: string) {
    await http.delete(`/plans/${planId}/invite-link`)
  },
  async removeParticipant(planId: string, userId: string) {
    await http.delete(`/plans/${planId}/participants/${userId}`)
  },
  async resolveInvitation(token: string) {
    const { data } = await http.get<PlanInvitation>(
      `/plans/invitations/${token}`
    )
    return data
  },
  async acceptInvitation(token: string) {
    const { data } = await http.post<PlanInvitation>(
      `/plans/invitations/${token}/accept`
    )
    return data
  },
}

export const periodService = {
  async create(payload: {
    month: number
    year: number
    financialPlanId: string
  }) {
    const { data } = await http.post<Period>("/periods", payload)
    return data
  },
  async delete(id: string) {
    await http.delete(`/periods/${id}`)
  },
  async getTransactionsByPeriod(
    periodOrPeriodId: Period | string | null | undefined
  ) {
    const periodId =
      typeof periodOrPeriodId === "string"
        ? periodOrPeriodId
        : periodOrPeriodId?.id
    const transactionsPath =
      resolveLink(
        typeof periodOrPeriodId === "string"
          ? null
          : periodOrPeriodId?._links?.transactions
      ) || (periodId ? `/periods/${periodId}/transactions` : null)

    if (!transactionsPath) {
      return []
    }

    const { data } =
      await http.get<EmbeddedCollection<Transaction, "transactions">>(
        transactionsPath
      )
    return embedded(data, "transactions")
  },
  async getInvoicesByPeriod(
    periodOrPeriodId: Period | string | null | undefined
  ) {
    const periodId =
      typeof periodOrPeriodId === "string"
        ? periodOrPeriodId
        : periodOrPeriodId?.id
    const invoicesPath =
      resolveLink(
        typeof periodOrPeriodId === "string"
          ? null
          : periodOrPeriodId?._links?.invoices
      ) || (periodId ? `/periods/${periodId}/invoices` : null)

    if (!invoicesPath) {
      return []
    }

    const { data } =
      await http.get<EmbeddedCollection<Invoice, "invoices">>(invoicesPath)
    return embedded(data, "invoices")
  },
}

export const creditCardService = {
  async getMyCreditCards() {
    const { data } = await http.get<
      EmbeddedCollection<CreditCard, "creditCards">
    >("/users/me/credit-cards")
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
  async create(payload: {
    creditCardId: string
    periodId: string
    amount: number
  }) {
    const { data } = await http.post<Invoice>("/credit-card-invoices", payload)
    return data
  },
  async update(
    id: string,
    payload: { creditCardId: string; periodId: string; amount: number }
  ) {
    const { data } = await http.put<Invoice>(
      `/credit-card-invoices/${id}`,
      payload
    )
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
    const { data } = await http.post<TransactionCategory>(
      "/transaction-categories",
      payload
    )
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
    category?: { id?: string; name?: string } | null
    dueDate?: string | null
    paymentDate?: string | null
    paymentStatus?: "PENDING" | "PAID" | null
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
      category?: { id?: string; name?: string } | null
      dueDate?: string | null
      paymentDate?: string | null
      paymentStatus?: "PENDING" | "PAID" | null
    }
    numberOfPeriods: number
  }) {
    const { data } = await http.post<Transaction[]>(
      "/transactions/recurring",
      payload
    )
    return data
  },
  async updatePartial(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch<Transaction>(
      `/transactions/${id}`,
      payload
    )
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
  async updateMe(payload: { name: string; email: string }) {
    const { data } = await http.patch<User>("/users/me", payload)
    return data
  },
  async updatePassword(payload: {
    currentPassword: string
    newPassword: string
  }) {
    await http.put("/users/me/password", payload)
  },
}

export const reportService = {
  async getSpendingByCategory(periodId?: string | null) {
    if (!periodId) {
      return []
    }

    const { data } = await http.get<CategorySpending[]>(
      "/reports/spending-by-category",
      {
        params: { periodId },
      }
    )

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
  ownCards: () =>
    queryOptions({
      queryKey: financeKeys.ownCards,
      queryFn: creditCardService.getMyCreditCards,
      staleTime: 1000 * 60 * 10,
    }),
  planCards: (plan: Plan | null) =>
    queryOptions({
      queryKey: financeKeys.planCards(plan?.id),
      queryFn: () => planService.getCreditCards(plan?.id),
      enabled: Boolean(plan?.id),
      staleTime: 1000 * 60 * 10,
      placeholderData: keepPreviousData,
    }),
  categories: () =>
    queryOptions({
      queryKey: financeKeys.categories,
      queryFn: transactionCategoryService.getAll,
      staleTime: 1000 * 60 * 10,
    }),
}
