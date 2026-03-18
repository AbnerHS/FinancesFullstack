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
  Period,
  Plan,
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
  return useQuery(financeQueries.plans())
}

export function usePeriods(plan: Plan | null) {
  return useQuery(financeQueries.periods(plan))
}

export function useCreditCards() {
  return useQuery(financeQueries.cards())
}

export function useTransactionCategories() {
  return useQuery(financeQueries.categories())
}

export function useDashboard() {
  const { data: plans = [], isLoading: plansLoading } = usePlans()
  const user = useAuthStore((state) => state.user)
  const selectedPlanId = useDashboardStore((state) => state.selectedPlanId)
  const selectedPeriodIds = useDashboardStore((state) => state.selectedPeriodIds)
  const setSelectedPlanId = useDashboardStore((state) => state.setSelectedPlanId)
  const setSelectedPeriodIds = useDashboardStore((state) => state.setSelectedPeriodIds)

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  )

  useEffect(() => {
    if (plansLoading || !activePlan) {
      return
    }

    if (activePlan.id !== selectedPlanId) {
      setSelectedPlanId(activePlan.id)
    }
  }, [activePlan, plansLoading, selectedPlanId, setSelectedPlanId])

  const {
    data: periods = [],
    isLoading: periodsLoading,
    isFetched: periodsFetched,
  } = usePeriods(activePlan)

  useEffect(() => {
    if (!activePlan || !periodsFetched || periodsLoading) {
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

  const peopleQueries = useQueries({
    queries: [
      {
        queryKey: financeKeys.userById(activePlan?.ownerId),
        queryFn: () => userService.getById(activePlan?.ownerId),
        enabled: Boolean(activePlan?.ownerId),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: financeKeys.userById(activePlan?.partnerId),
        queryFn: () => userService.getById(activePlan?.partnerId),
        enabled: Boolean(activePlan?.partnerId),
        staleTime: 1000 * 60 * 10,
      },
    ],
  })

  const ownerUser = peopleQueries[0]?.data ?? null
  const partnerUser = peopleQueries[1]?.data ?? null

  const responsibleOptions = useMemo<ResponsibleOption[]>(() => {
    if (!activePlan) {
      return []
    }

    const options: ResponsibleOption[] = []
    if (activePlan.ownerId) {
      options.push({
        id: activePlan.ownerId,
        label: ownerUser?.name || "Dono",
      })
    }
    if (activePlan.partnerId) {
      options.push({
        id: activePlan.partnerId,
        label: partnerUser?.name || "Parceiro",
      })
    }
    return options
  }, [activePlan, ownerUser?.name, partnerUser?.name])

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
    responsibleOptions,
    userId: user?.id ?? null,
    ownerUser,
    partnerUser,
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
          ownerId: activePlan.ownerId,
          partnerId: activePlan.partnerId || null,
        })
      }

      if (!userId) {
        throw new Error("Usuário não identificado.")
      }

      const createdPlan = await planService.create({ name, ownerId: userId, partnerId: null })

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

export function usePartnerManager(activePlan: Plan | null) {
  const queryClient = useQueryClient()
  const [partnerDraftByPlanId, setPartnerDraftByPlanId] = useState<Record<string, string>>({})

  const { data: users = [] } = useQuery({
    queryKey: financeKeys.users,
    queryFn: userService.getAll,
    staleTime: 1000 * 60 * 5,
  })

  const activePlanId = activePlan?.id || ""
  const selectedPartnerId = activePlanId
    ? partnerDraftByPlanId[activePlanId] ?? activePlan?.partnerId ?? ""
    : ""
  const persistedPartnerId = activePlan?.partnerId ?? ""

  const selectableUsers = useMemo(
    () => users.filter((user) => user.id !== activePlan?.ownerId),
    [activePlan?.ownerId, users]
  )

  const savePartner = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Plano inválido.")
      }

      return planService.update(activePlan.id, {
        name: activePlan.name,
        ownerId: activePlan.ownerId,
        partnerId: selectedPartnerId || null,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: financeKeys.plans })
      setPartnerDraftByPlanId((current) => {
        const next = { ...current }
        delete next[activePlanId]
        return next
      })
    },
  })

  return {
    selectableUsers,
    selectedPartnerId,
    hasChanges: selectedPartnerId !== persistedPartnerId,
    setSelectedPartnerId: (value: string) =>
      setPartnerDraftByPlanId((current) => ({ ...current, [activePlanId]: value })),
    savePartner,
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
        throw new Error("Transacao invalida.")
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
      ? getErrorMessage(linkTransactionToInvoice.error, "Nao foi possivel vincular a transacao.")
      : null,
  }
}
