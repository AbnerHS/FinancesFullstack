import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { http } from "@/lib/api/http.ts"
import type { EmbeddedCollection } from "@/lib/api/types.ts"
import type {
  CreditCard,
  Invoice,
  Period,
  Plan,
  PlanMonthSummary,
  PlanInvitation,
  PlanInviteLink,
  PlanParticipant,
  Transaction,
  TransactionCategory,
  User,
} from "@/features/finance/types.ts"

export const financeKeys = {
  plans: ["plans-me"] as const,
  // Meses com lançamentos (e totais) do plano.
  months: (planId?: string | null) => ["plan-months", planId] as const,
  participants: (planId?: string | null) =>
    ["plan-participants", planId] as const,
  inviteLink: (planId?: string | null) => ["plan-invite-link", planId] as const,
  invitation: (token?: string | null) => ["plan-invitation", token] as const,
  cards: ["credit-cards"] as const,
  ownCards: ["credit-cards", "me"] as const,
  planCards: (planId?: string | null) =>
    ["credit-cards", "plan", planId] as const,
  categories: ["transaction-categories"] as const,
  // O id do mês (AAAA-MM) se repete entre planos, por isso as chaves incluem o plano.
  periodTransactionsRoot: ["period-transactions"] as const,
  periodTransactions: (period?: Pick<Period, "planId" | "id"> | null) =>
    ["period-transactions", period?.planId, period?.id] as const,
  periodInvoicesRoot: ["period-invoices"] as const,
  periodInvoices: (period?: Pick<Period, "planId" | "id"> | null) =>
    ["period-invoices", period?.planId, period?.id] as const,
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
  async getMonths(planId?: string | null) {
    if (!planId) {
      return []
    }

    const { data } = await http.get<PlanMonthSummary[]>(
      `/plans/${planId}/months`
    )
    return data ?? []
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
  async getTransactionsByPeriod(period: Period | null | undefined) {
    if (!period) {
      return []
    }

    const { data } = await http.get<
      EmbeddedCollection<Transaction, "transactions">
    >(`/plans/${period.planId}/transactions`, { params: { month: period.id } })
    return embedded(data, "transactions")
  },
  async getInvoicesByPeriod(period: Period | null | undefined) {
    if (!period) {
      return []
    }

    const { data } = await http.get<EmbeddedCollection<Invoice, "invoices">>(
      `/plans/${period.planId}/invoices`,
      { params: { month: period.id } }
    )
    return embedded(data, "invoices")
  },
  async getRecurringGroup(planId: string, recurringGroupId: string) {
    const { data } = await http.get<
      EmbeddedCollection<Transaction, "transactions">
    >(`/plans/${planId}/transactions`, { params: { recurringGroupId } })
    return embedded(data, "transactions")
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
    planId: string
    creditCardId: string
    referenceMonth: string
    amount: number
  }) {
    const { data } = await http.post<Invoice>("/credit-card-invoices", payload)
    return data
  },
  async update(
    id: string,
    payload: { creditCardId: string; referenceMonth: string; amount: number }
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
    planId: string
    referenceDate: string
    responsibleUserId?: string | null
    category?: { id?: string; name?: string } | null
    dueDate?: string | null
    paymentDate?: string | null
    paymentStatus?: "PENDING" | "PAID" | null
    billingDocument?: { type: "LINK"; url: string } | null
  }) {
    const { data } = await http.post<Transaction>("/transactions", payload)
    return data
  },
  async createRecurring(payload: {
    transaction: {
      description: string
      amount: number
      type: "REVENUE" | "EXPENSE"
      planId: string
      referenceDate: string
      responsibleUserId?: string | null
      category?: { id?: string; name?: string } | null
      dueDate?: string | null
      paymentDate?: string | null
      paymentStatus?: "PENDING" | "PAID" | null
      billingDocument?: { type: "LINK"; url: string } | null
    }
    occurrences: number
  }) {
    const { data } = await http.post<Transaction[]>(
      "/transactions/recurring",
      payload
    )
    return data
  },
  /** Grava a ordem do mês inteiro de uma vez. */
  async reorder(period: Period, transactionIds: string[]) {
    await http.put(`/plans/${period.planId}/transactions/order`, {
      month: period.id,
      transactionIds,
    })
  },
  async updatePartial(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch<Transaction>(
      `/transactions/${id}`,
      payload
    )
    return data
  },
  async uploadBillingDocumentFile(
    id: string,
    payload: { file: File; scope?: "SINGLE" | "GROUP" }
  ) {
    const formData = new FormData()
    formData.append("file", payload.file)

    const { data } = await http.post<Transaction>(
      `/transactions/${id}/billing-document/file`,
      formData,
      {
        params: { scope: payload.scope ?? "SINGLE" },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    )

    return data
  },
  async deleteBillingDocument(
    id: string,
    scope: "SINGLE" | "GROUP" = "SINGLE"
  ) {
    const { data } = await http.delete<Transaction>(
      `/transactions/${id}/billing-document`,
      {
        params: { scope },
      }
    )
    return data
  },
  async downloadBillingDocument(id: string) {
    const { data } = await http.get<Blob>(
      `/transactions/${id}/billing-document/download`,
      {
        responseType: "blob",
      }
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

export const financeQueries = {
  plans: () =>
    queryOptions({
      queryKey: financeKeys.plans,
      queryFn: planService.getMyPlans,
      staleTime: 1000 * 60 * 5,
    }),
  months: (plan: Plan | null) =>
    queryOptions({
      queryKey: financeKeys.months(plan?.id),
      queryFn: () => planService.getMonths(plan?.id),
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
