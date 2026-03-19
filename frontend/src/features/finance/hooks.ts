import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuthStore } from "@/stores/auth-store.ts"
import { getErrorMessage } from "@/lib/errors.ts"
import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import {
  creditCardService,
  financeKeys,
  financeQueries,
  invoiceService,
  periodService,
  planService,
  reportService,
  transactionCategoryService,
  transactionService,
  userService,
} from "@/features/finance/services.ts"
import type {
  CreditCard,
  Invoice,
  Period,
  Plan,
  PlanInviteLink,
  ResponsibleOption,
  Transaction,
} from "@/features/finance/types.ts"
import {
  buildCategoryChartData,
  buildComparisonChartData,
  calculateStats,
  computeVariation,
  formatMonthYear,
  parseCurrencyInput,
} from "@/features/finance/utils.ts"

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false
  }

  return a.every((value, index) => value === b[index])
}

function orderByPeriods(ids: string[], periods: Period[]) {
  const orderMap = new Map(periods.map((period, index) => [period.id, index]))
  return [...ids].sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0))
}

export function usePlans() {
  const isAuthenticated = Boolean(useAuthStore((state) => state.user?.id))
  return useQuery({
    ...financeQueries.plans(),
    enabled: isAuthenticated,
  })
}

export function usePeriods(plan: Plan | null) {
  return useQuery(financeQueries.periods(plan))
}

export function useCreditCards() {
  const isAuthenticated = Boolean(useAuthStore((state) => state.user?.id))
  return useQuery({
    ...financeQueries.cards(),
    enabled: isAuthenticated,
  })
}

export function useTransactionCategories() {
  const isAuthenticated = Boolean(useAuthStore((state) => state.user?.id))
  return useQuery({
    ...financeQueries.categories(),
    enabled: isAuthenticated,
  })
}

export function useDashboard() {
  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = Boolean(user?.id)
  const selectedPlanId = useDashboardStore((state) => state.selectedPlanId)
  const selectedPeriodIds = useDashboardStore((state) => state.selectedPeriodIds)
  const setSelectedPlanId = useDashboardStore((state) => state.setSelectedPlanId)
  const setSelectedPeriodIds = useDashboardStore((state) => state.setSelectedPeriodIds)

  const activePlan = useMemo(
    () => (isAuthenticated ? plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null : null),
    [isAuthenticated, plans, selectedPlanId]
  )

  useEffect(() => {
    if (isAuthenticated) {
      return
    }

    if (selectedPlanId !== null) {
      setSelectedPlanId(null)
    }

    if (selectedPeriodIds.length > 0) {
      setSelectedPeriodIds([])
    }
  }, [isAuthenticated, selectedPeriodIds, selectedPlanId, setSelectedPeriodIds, setSelectedPlanId])

  useEffect(() => {
    if (!isAuthenticated || plansLoading || !activePlan) {
      return
    }

    if (activePlan.id !== selectedPlanId) {
      setSelectedPlanId(activePlan.id)
    }
  }, [activePlan, isAuthenticated, plansLoading, selectedPlanId, setSelectedPlanId])

  const {
    data: periods = [],
    isLoading: periodsLoading,
    isFetched: periodsFetched,
  } = usePeriods(activePlan)

  useEffect(() => {
    if (!isAuthenticated || !activePlan || !periodsFetched || periodsLoading) {
      return
    }

    if (periods.length === 0) {
      if (selectedPeriodIds.length > 0) {
        setSelectedPeriodIds([])
      }
      return
    }

    const validIds = new Set(periods.map((period) => period.id))
    const filtered = selectedPeriodIds.filter((id) => validIds.has(id))
    const fallback = filtered.length > 0 ? filtered : [periods[0].id]
    const ordered = orderByPeriods(fallback, periods)

    if (!arraysEqual(ordered, selectedPeriodIds)) {
      setSelectedPeriodIds(ordered)
    }
  }, [
    activePlan,
    isAuthenticated,
    periods,
    periodsFetched,
    periodsLoading,
    selectedPeriodIds,
    setSelectedPeriodIds,
  ])

  const togglePeriodId = useCallback(
    (periodId: string) => {
      setSelectedPeriodIds((current) => {
        const exists = current.includes(periodId)
        const next = exists ? current.filter((id) => id !== periodId) : [...current, periodId]

        if (next.length === 0 && periods.length > 0) {
          return [periods[0].id]
        }

        return orderByPeriods(next, periods)
      })
    },
    [periods, setSelectedPeriodIds]
  )

  const selectedPeriods = useMemo(
    () =>
      selectedPeriodIds
        .map((id) => periods.find((period) => period.id === id))
        .filter((period): period is Period => Boolean(period)),
    [periods, selectedPeriodIds]
  )

  const transactionQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: financeKeys.periodTransactions(period.id),
      queryFn: () => periodService.getTransactionsByPeriod(period),
      enabled: Boolean(period.id),
      staleTime: 1000 * 60 * 2,
      placeholderData: [] as Transaction[],
    })),
  })

  const invoiceQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: financeKeys.periodInvoices(period.id),
      queryFn: () => periodService.getInvoicesByPeriod(period),
      enabled: Boolean(period.id),
      staleTime: 1000 * 60 * 2,
      placeholderData: [] as Array<{ id: string; amount: number | string; creditCardId: string; periodId: string }>,
    })),
  })

  const { data: participants = [] } = useQuery({
    queryKey: financeKeys.participants(activePlan?.id),
    queryFn: () => planService.getParticipants(activePlan?.id),
    enabled: Boolean(activePlan?.id),
    staleTime: 1000 * 60 * 5,
  })

  const responsibleOptions = useMemo<ResponsibleOption[]>(() => {
    return participants.map((participant) => ({
      id: participant.userId,
      label: participant.name || (participant.role === "OWNER" ? "Owner" : "Parceiro"),
    }))
  }, [participants])

  const categorySpendingQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: financeKeys.categoryReport(period.id),
      queryFn: () => reportService.getSpendingByCategory(period.id),
      enabled: Boolean(period.id),
      staleTime: 1000 * 60 * 5,
      placeholderData: [],
    })),
  })

  const periodPanels = useMemo(
    () =>
      selectedPeriods.map((period, index) => {
        const transactions = (transactionQueries[index]?.data ?? []) as Transaction[]
        const invoices = (invoiceQueries[index]?.data ?? []) as Array<{
          id: string
          amount: number | string
          creditCardId: string
          periodId: string
        }>
        const invoicesAmount = invoices.reduce(
          (total, invoice) => total + Number(invoice.amount || 0),
          0
        )

        return {
          period,
          label: formatMonthYear(period),
          invoices,
          transactions,
          stats: calculateStats(transactions, invoicesAmount),
          transactionsLoading: Boolean(transactionQueries[index]?.isLoading),
          invoicesLoading: Boolean(invoiceQueries[index]?.isLoading),
        }
      }),
    [invoiceQueries, selectedPeriods, transactionQueries]
  )

  const combinedStats = useMemo(
    () =>
      periodPanels.reduce(
        (acc, panel) => {
          acc.incomes += panel.stats.incomes
          acc.expenses += panel.stats.expenses
          acc.balance += panel.stats.balance
          return acc
        },
        { incomes: 0, expenses: 0, balance: 0 }
      ),
    [periodPanels]
  )

  const categorySpending = useMemo(() => {
    const totals = new Map<string, number>()
    categorySpendingQueries.forEach((query) => {
      const items = query.data ?? []
      items.forEach((item) => {
        const label = item.category || "Sem categoria"
        totals.set(label, (totals.get(label) ?? 0) + Number(item.totalAmount || 0))
      })
    })
    return [...totals.entries()]
      .map(([category, totalAmount]) => ({ category, totalAmount }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [categorySpendingQueries])

  const allTransactions = useMemo(
    () => periodPanels.flatMap((panel) => panel.transactions),
    [periodPanels]
  )

  const comparisonData = useMemo(() => buildComparisonChartData(periodPanels), [periodPanels])
  const variation = useMemo(() => computeVariation(comparisonData), [comparisonData])
  const { data: creditCards = [] } = useCreditCards()
  const { data: transactionCategories = [] } = useTransactionCategories()
  const isPlanOwner = Boolean(activePlan?.ownerId && user?.id && activePlan.ownerId === user.id)

  return {
    plans,
    plansLoading,
    periods,
    periodsLoading,
    selectedPlanId,
    activePlan,
    selectedPeriodIds,
    setSelectedPlanId,
    selectedPeriods,
    togglePeriodId,
    periodPanels,
    combinedStats,
    categorySpending,
    allTransactions,
    comparisonData,
    variation,
    creditCards,
    transactionCategories,
    participants,
    isPlanOwner,
    responsibleOptions,
    userId: user?.id ?? null,
    buildCategoryChartData: (responsibleFilter: string) =>
      buildCategoryChartData({
        categorySpending,
        filteredTransactions: allTransactions.filter(
          (transaction) =>
            !responsibleFilter || transaction.responsibleUserId === responsibleFilter
        ),
        responsibleFilter,
      }),
  }
}

export function useProfileSettings() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  const profileMutation = useMutation({
    mutationFn: userService.updateMe,
    onSuccess: (updatedUser) => {
      setUser({ user: updatedUser })
    },
  })

  const passwordMutation = useMutation({
    mutationFn: userService.updatePassword,
  })

  return {
    user,
    profileMutation,
    passwordMutation,
    profileError: profileMutation.error
      ? getErrorMessage(profileMutation.error, "Não foi possível atualizar o perfil.")
      : null,
    passwordError: passwordMutation.error
      ? getErrorMessage(passwordMutation.error, "Não foi possível atualizar a senha.")
      : null,
  }
}

export function useCreditCardManager({ userId }: { userId: string | null }) {
  const queryClient = useQueryClient()
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [form, setFormState] = useState({ name: "" })

  const resetForm = () => {
    setEditingCard(null)
    setFormState({ name: "" })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Usuário não encontrado.")
      }

      const name = form.name.trim()
      if (!name) {
        throw new Error("Informe o nome do cartão.")
      }

      const payload = { name, userId }
      if (editingCard?.id) {
        return creditCardService.update(editingCard.id, payload)
      }
      return creditCardService.create(payload)
    },
    onSuccess: async () => {
      resetForm()
      await queryClient.invalidateQueries({ queryKey: financeKeys.cards })
    },
  })

  return {
    form,
    setForm: (next: { name: string }) => setFormState(next),
    editingCard,
    isEditing: Boolean(editingCard?.id),
    saveMutation,
    errorMessage: saveMutation.error
      ? getErrorMessage(saveMutation.error, "Não foi possível salvar o cartão.")
      : null,
    startCreate: resetForm,
    startEdit: (card: CreditCard) => {
      setEditingCard(card)
      setFormState({ name: card.name ?? "" })
    },
    cancelEdit: resetForm,
  }
}

export function useInvoiceManager({
  creditCards,
  periods,
  selectedPeriodIds,
}: {
  creditCards: CreditCard[]
  periods: Period[]
  selectedPeriodIds: string[]
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    creditCardId: "",
    periodId: "",
    amount: "",
  })

  const resolvedForm = useMemo(() => {
    const hasCurrentCard = creditCards.some((card) => card.id === form.creditCardId)
    const hasCurrentPeriod = periods.some((period) => period.id === form.periodId)
    const preferredPeriodId = selectedPeriodIds[0] || periods[0]?.id || ""

    return {
      ...form,
      creditCardId: hasCurrentCard ? form.creditCardId : creditCards[0]?.id || "",
      periodId: hasCurrentPeriod ? form.periodId : preferredPeriodId,
    }
  }, [creditCards, form, periods, selectedPeriodIds])

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!resolvedForm.creditCardId) {
        throw new Error("Selecione um cartão.")
      }
      if (!resolvedForm.periodId) {
        throw new Error("Selecione um período.")
      }

      const amountNumber = parseCurrencyInput(resolvedForm.amount)
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor válido.")
      }

      return invoiceService.create({
        creditCardId: resolvedForm.creditCardId,
        periodId: resolvedForm.periodId,
        amount: amountNumber,
      })
    },
    onSuccess: async () => {
      setForm((current) => ({ ...current, amount: "" }))
      await queryClient.invalidateQueries({ queryKey: ["period-invoices"] })
    },
  })

  return {
    form: resolvedForm,
    setForm,
    createInvoice,
    errorMessage: createInvoice.error
      ? getErrorMessage(createInvoice.error, "Não foi possível criar a fatura.")
      : null,
  }
}

export function usePeriodInvoiceManager({
  creditCards,
  invoices,
  periodId,
}: {
  creditCards: CreditCard[]
  invoices: Invoice[]
  periodId: string
}) {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    creditCardId: creditCards[0]?.id || "",
    amount: "",
  })
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState("")

  useEffect(() => {
    setCreateForm((current) => ({
      ...current,
      creditCardId: creditCards.some((card) => card.id === current.creditCardId)
        ? current.creditCardId
        : creditCards[0]?.id || "",
    }))
  }, [creditCards])

  const invalidatePeriodInvoices = async () => {
    await queryClient.invalidateQueries({ queryKey: financeKeys.periodInvoices(periodId) })
  }

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!createForm.creditCardId) {
        throw new Error("Selecione um cartão.")
      }

      const amountNumber = parseCurrencyInput(createForm.amount)
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor válido.")
      }

      return invoiceService.create({
        creditCardId: createForm.creditCardId,
        periodId,
        amount: amountNumber,
      })
    },
    onSuccess: async () => {
      setCreateForm((current) => ({ ...current, amount: "" }))
      setIsCreateOpen(false)
      await invalidatePeriodInvoices()
    },
  })

  const updateInvoice = useMutation({
    mutationFn: async () => {
      if (!editingInvoiceId) {
        throw new Error("Fatura inválida.")
      }

      const invoice = invoices.find((item) => item.id === editingInvoiceId)
      if (!invoice) {
        throw new Error("Fatura não encontrada.")
      }

      const amountNumber = parseCurrencyInput(editingAmount)
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor válido.")
      }

      return invoiceService.update(editingInvoiceId, {
        creditCardId: invoice.creditCardId,
        periodId: invoice.periodId,
        amount: amountNumber,
      })
    },
    onSuccess: async () => {
      setEditingInvoiceId(null)
      setEditingAmount("")
      await invalidatePeriodInvoices()
    },
  })

  const startCreate = () => {
    setEditingInvoiceId(null)
    setEditingAmount("")
    setIsCreateOpen(true)
  }

  const cancelCreate = () => {
    setCreateForm((current) => ({ ...current, amount: "" }))
    setIsCreateOpen(false)
  }

  const startEdit = (invoice: Invoice) => {
    setIsCreateOpen(false)
    setEditingInvoiceId(invoice.id)
    setEditingAmount(
      Number(invoice.amount || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    )
  }

  const cancelEdit = () => {
    setEditingInvoiceId(null)
    setEditingAmount("")
  }

  return {
    isCreateOpen,
    createForm,
    setCreateForm,
    startCreate,
    cancelCreate,
    createInvoice,
    editingInvoiceId,
    editingAmount,
    setEditingAmount,
    startEdit,
    cancelEdit,
    updateInvoice,
    createErrorMessage: createInvoice.error
      ? getErrorMessage(createInvoice.error, "Não foi possível criar a fatura.")
      : null,
    updateErrorMessage: updateInvoice.error
      ? getErrorMessage(updateInvoice.error, "Não foi possível atualizar a fatura.")
      : null,
  }
}

export function usePlanManager({
  activePlan,
  userId,
  onSelectPlanId,
}: {
  activePlan: Plan | null
  userId: string | null
  onSelectPlanId: (id: string | null) => void
}) {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [draft, setDraft] = useState("")
  const [mode, setMode] = useState<"create" | "edit">("create")
  const [createYearPeriods, setCreateYearPeriods] = useState(false)
  const [periodsYear, setPeriodsYear] = useState(currentYear)

  const resetCreateOptions = () => {
    setCreateYearPeriods(false)
    setPeriodsYear(currentYear)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = draft.trim()
      if (!name) {
        throw new Error("Informe um nome para o plano.")
      }

      if (mode === "edit" && activePlan?.id) {
        return planService.update(activePlan.id, {
          name,
        })
      }

      if (!userId) {
        throw new Error("Usuário não identificado.")
      }

      const createdPlan = await planService.create({ name })

      if (createYearPeriods) {
        if (!Number.isInteger(periodsYear) || periodsYear < 2000) {
          throw new Error("Informe um ano válido para criar os períodos.")
        }

        await Promise.all(
          Array.from({ length: 12 }, (_, index) =>
            periodService.create({
              month: index + 1,
              year: periodsYear,
              financialPlanId: createdPlan.id,
            })
          )
        )
      }

      return createdPlan
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.plans }),
        response?.id
          ? queryClient.invalidateQueries({ queryKey: financeKeys.periods(response.id) })
          : Promise.resolve(),
      ])
      if (response?.id) {
        onSelectPlanId(response.id)
      }
      setMode("create")
      setDraft("")
      resetCreateOptions()
    },
  })

  return {
    createYearPeriods,
    draft,
    mode,
    periodsYear,
    setDraft,
    setCreateYearPeriods,
    setPeriodsYear,
    saveMutation,
    startCreate: () => {
      setMode("create")
      setDraft("")
      resetCreateOptions()
    },
    startEdit: () => {
      setMode("edit")
      setDraft(activePlan?.name || "")
      resetCreateOptions()
    },
    errorMessage: saveMutation.error
      ? getErrorMessage(saveMutation.error, "Não foi possível salvar o plano.")
      : null,
  }
}

export function usePeriodsManager(activePlan: Plan | null) {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [draft, setDraft] = useState({ month: new Date().getMonth() + 1, year: currentYear })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Selecione um plano antes de criar um período.")
      }

      return periodService.create({
        month: Number(draft.month),
        year: Number(draft.year),
        financialPlanId: activePlan.id,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: financeKeys.periods(activePlan?.id) })
    },
  })

  return {
    draft,
    setDraft,
    saveMutation,
    errorMessage: saveMutation.error
      ? getErrorMessage(saveMutation.error, "Não foi possível salvar o período.")
      : null,
  }
}

export function usePlanCollaborationManager({
  activePlan,
  isPlanOwner,
}: {
  activePlan: Plan | null
  isPlanOwner: boolean
}) {
  const queryClient = useQueryClient()
  const { data: inviteLink = null, isLoading: inviteLinkLoading } = useQuery({
    queryKey: financeKeys.inviteLink(activePlan?.id),
    queryFn: () => planService.getInviteLink(activePlan?.id),
    enabled: Boolean(activePlan?.id && isPlanOwner),
    staleTime: 1000 * 60,
  })

  const invalidatePlanCollaboration = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: financeKeys.plans }),
      queryClient.invalidateQueries({ queryKey: financeKeys.participants(activePlan?.id) }),
      queryClient.invalidateQueries({ queryKey: financeKeys.inviteLink(activePlan?.id) }),
    ])
  }

  const rotateInviteLink = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Plano inválido.")
      }

      return planService.rotateInviteLink(activePlan.id)
    },
    onSuccess: invalidatePlanCollaboration,
  })

  const revokeInviteLink = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Plano invÃ¡lido.")
      }

      await planService.revokeInviteLink(activePlan.id)
    },
    onSuccess: invalidatePlanCollaboration,
  })

  const removeParticipant = useMutation({
    mutationFn: async (userId: string) => {
      if (!activePlan?.id) {
        throw new Error("Plano invÃ¡lido.")
      }

      await planService.removeParticipant(activePlan.id, userId)
    },
    onSuccess: invalidatePlanCollaboration,
  })

  return {
    inviteLink: inviteLink as PlanInviteLink | null,
    inviteLinkLoading,
    rotateInviteLink,
    revokeInviteLink,
    removeParticipant,
    inviteErrorMessage: rotateInviteLink.error
      ? getErrorMessage(rotateInviteLink.error, "NÃ£o foi possÃ­vel gerar o link de convite.")
      : revokeInviteLink.error
        ? getErrorMessage(revokeInviteLink.error, "NÃ£o foi possÃ­vel revogar o link de convite.")
        : removeParticipant.error
          ? getErrorMessage(removeParticipant.error, "NÃ£o foi possÃ­vel remover o participante.")
          : null,
  }
}

export function useCategoryManager() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState("")

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = draft.trim()
      if (!name) {
        throw new Error("Informe um nome para a categoria.")
      }

      return transactionCategoryService.create({ name })
    },
    onSuccess: async () => {
      setDraft("")
      await queryClient.invalidateQueries({ queryKey: financeKeys.categories })
    },
  })

  return {
    draft,
    setDraft,
    createMutation,
    errorMessage: createMutation.error
      ? getErrorMessage(createMutation.error, "Não foi possível salvar a categoria.")
      : null,
  }
}

export function useTransactionMutations(periodId: string, periods: Period[] = []) {
  const queryClient = useQueryClient()

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: financeKeys.periodTransactions(periodId) }),
      queryClient.invalidateQueries({ queryKey: financeKeys.periodInvoices(periodId) }),
      queryClient.invalidateQueries({ queryKey: financeKeys.categoryReport(periodId) }),
      queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
    ])
  }

  const createTransaction = useMutation({
    mutationFn: transactionService.create,
    onSuccess: invalidate,
  })

  const createRecurringTransaction = useMutation({
    mutationFn: transactionService.createRecurring,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.periodTransactionsRoot }),
        queryClient.invalidateQueries({ queryKey: ["report-spending-by-category"] }),
        queryClient.invalidateQueries({ queryKey: financeKeys.periodInvoices(periodId) }),
        queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
      ])
    },
  })

  const updateTransaction = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: Record<string, unknown>
    }) => {
      const recurringGroupId = payload.recurringGroupId as string | undefined
      const editScope = payload.editScope as "SINGLE" | "GROUP" | undefined
      const normalizedPayload = { ...payload }
      delete normalizedPayload.recurringGroupId
      delete normalizedPayload.editScope

      if (editScope !== "GROUP" || !recurringGroupId) {
        return transactionService.updatePartial(id, normalizedPayload)
      }

      const transactionsByPeriod = await Promise.all(
        periods.map((period) => periodService.getTransactionsByPeriod(period))
      )

      const recurringTransactions = transactionsByPeriod
        .flat()
        .filter((transaction) => transaction.recurringGroupId === recurringGroupId)

      if (recurringTransactions.length === 0) {
        throw new Error("Nenhuma transação recorrente encontrada para este grupo.")
      }

      await Promise.all(
        recurringTransactions.map((transaction) =>
          transactionService.updatePartial(transaction.id, normalizedPayload)
        )
      )

      return recurringTransactions
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.periodTransactionsRoot }),
        queryClient.invalidateQueries({ queryKey: ["report-spending-by-category"] }),
        queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
      ])
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: transactionService.delete,
    onSuccess: invalidate,
  })

  return {
    createTransaction,
    createRecurringTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export function useTransactionLinking(activePeriodId: string) {
  const queryClient = useQueryClient()
  const [paymentModalEntry, setPaymentModalEntry] = useState<Transaction | null>(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")

  const closePaymentModal = () => {
    setPaymentModalEntry(null)
    setSelectedInvoiceId("")
  }

  const openPaymentModal = (entry: Transaction) => {
    setPaymentModalEntry(entry)
    setSelectedInvoiceId(entry.creditCardInvoiceId || "")
  }

  const linkTransactionToInvoice = useMutation({
    mutationFn: async () => {
      if (!paymentModalEntry?.id) {
        throw new Error("Transação inválida.")
      }
      if (!selectedInvoiceId) {
        throw new Error("Selecione uma fatura.")
      }

      return transactionService.updatePartial(paymentModalEntry.id, {
        isClearedByInvoice: true,
        creditCardInvoiceId: selectedInvoiceId,
      })
    },
    onSuccess: async () => {
      closePaymentModal()
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periodTransactions(activePeriodId),
      })
    },
  })

  const unlinkTransactionFromInvoice = useMutation({
    mutationFn: async (transactionId: string) =>
      transactionService.updatePartial(transactionId, {
        isClearedByInvoice: false,
        creditCardInvoiceId: null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periodTransactions(activePeriodId),
      })
    },
  })

  return {
    paymentModalEntry,
    selectedInvoiceId,
    setSelectedInvoiceId,
    openPaymentModal,
    closePaymentModal,
    linkTransactionToInvoice,
    unlinkTransactionFromInvoice,
    linkTransactionError: linkTransactionToInvoice.error
      ? getErrorMessage(linkTransactionToInvoice.error, "Não foi possível vincular a transação.")
      : null,
  }
}
