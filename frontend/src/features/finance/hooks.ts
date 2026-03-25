import { useCallback, useEffect, useMemo, useState } from "react"
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

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
  findDefaultPeriod,
  formatMonthYear,
  parseCurrencyInput,
  sortPeriods,
} from "@/features/finance/utils.ts"

type PeriodRange = {
  startPeriodId: string | null
  endPeriodId: string | null
}

const EMPTY_PERIOD_RANGE: PeriodRange = {
  startPeriodId: null,
  endPeriodId: null,
}

function rangesEqual(left: PeriodRange, right: PeriodRange) {
  return (
    left.startPeriodId === right.startPeriodId &&
    left.endPeriodId === right.endPeriodId
  )
}

function buildLegacyPeriodRange(ids: string[]) {
  return {
    startPeriodId: ids[0] ?? null,
    endPeriodId: ids.length > 0 ? ids[ids.length - 1] : null,
  }
}

function shiftIsoDateToPeriod(
  dateValue: unknown,
  period: Pick<Period, "month" | "year">
) {
  if (typeof dateValue !== "string" || !dateValue) {
    return null
  }

  const [year, month, day] = dateValue.split("-").map(Number)
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    year <= 0 ||
    month <= 0 ||
    day <= 0
  ) {
    return null
  }

  const resolvedDay = Math.min(
    day,
    new Date(period.year, period.month, 0).getDate()
  )

  return `${String(period.year).padStart(4, "0")}-${String(period.month).padStart(2, "0")}-${String(
    resolvedDay
  ).padStart(2, "0")}`
}

function buildRecurringGroupPayload({
  transaction,
  basePayload,
  anchorDueDate,
  period,
  currentTransactionId,
}: {
  transaction: Transaction
  basePayload: Record<string, unknown>
  anchorDueDate: unknown
  period: Period | undefined
  currentTransactionId: string
}) {
  if (transaction.id === currentTransactionId) {
    return basePayload
  }

  const groupPayload = { ...basePayload }
  delete groupPayload.paymentDate
  delete groupPayload.paymentStatus

  if (!Object.prototype.hasOwnProperty.call(basePayload, "dueDate")) {
    return groupPayload
  }

  if (anchorDueDate == null) {
    groupPayload.dueDate = null
    return groupPayload
  }

  if (!period) {
    return groupPayload
  }

  groupPayload.dueDate = shiftIsoDateToPeriod(anchorDueDate, period)
  return groupPayload
}

function normalizePeriodRange(
  range: PeriodRange,
  periods: Period[],
  fallbackPeriodId: string | null
) {
  if (periods.length === 0 || !fallbackPeriodId) {
    return EMPTY_PERIOD_RANGE
  }

  const periodIds = periods.map((period) => period.id)
  const startCandidate =
    range.startPeriodId && periodIds.includes(range.startPeriodId)
      ? range.startPeriodId
      : null
  const endCandidate =
    range.endPeriodId && periodIds.includes(range.endPeriodId)
      ? range.endPeriodId
      : null

  const nextStartPeriodId = startCandidate ?? endCandidate ?? fallbackPeriodId
  const nextEndPeriodId = endCandidate ?? startCandidate ?? fallbackPeriodId
  const startIndex = periodIds.indexOf(nextStartPeriodId)
  const endIndex = periodIds.indexOf(nextEndPeriodId)

  if (startIndex === -1 || endIndex === -1) {
    return {
      startPeriodId: fallbackPeriodId,
      endPeriodId: fallbackPeriodId,
    }
  }

  return startIndex <= endIndex
    ? {
        startPeriodId: nextStartPeriodId,
        endPeriodId: nextEndPeriodId,
      }
    : {
        startPeriodId: nextEndPeriodId,
        endPeriodId: nextStartPeriodId,
      }
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getSuggestedNextYear(periods: Period[]) {
  if (periods.length === 0) {
    return getCurrentYear()
  }

  return Math.max(...periods.map((period) => period.year)) + 1
}

async function createMissingPeriodsForYear({
  financialPlanId,
  year,
  periods,
}: {
  financialPlanId: string
  year: number
  periods: Period[]
}) {
  const existingMonths = new Set(
    periods
      .filter((period) => period.year === year)
      .map((period) => period.month)
  )
  const missingMonths = Array.from(
    { length: 12 },
    (_, index) => index + 1
  ).filter((month) => !existingMonths.has(month))

  if (missingMonths.length === 0) {
    return 0
  }

  await Promise.all(
    missingMonths.map((month) =>
      periodService.create({
        month,
        year,
        financialPlanId,
      })
    )
  )

  return missingMonths.length
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
  const { data: plans = [] } = usePlans()
  const selectedPlanId = useDashboardStore((state) => state.selectedPlanId)
  const userId = useAuthStore((state) => state.user?.id)
  const activePlan = useMemo(
    () =>
      userId
        ? plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null
        : null,
    [plans, selectedPlanId, userId]
  )

  return useQuery(financeQueries.planCards(activePlan))
}

export function useOwnCreditCards() {
  const isAuthenticated = Boolean(useAuthStore((state) => state.user?.id))
  return useQuery({
    ...financeQueries.ownCards(),
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
  const selectedStartPeriodId = useDashboardStore(
    (state) => state.selectedStartPeriodId
  )
  const selectedEndPeriodId = useDashboardStore(
    (state) => state.selectedEndPeriodId
  )
  const legacySelectedPeriodIds = useDashboardStore(
    (state) => state.selectedPeriodIds
  )
  const setSelectedPlanId = useDashboardStore(
    (state) => state.setSelectedPlanId
  )
  const setSelectedPeriodRange = useDashboardStore(
    (state) => state.setSelectedPeriodRange
  )
  const clearSelections = useDashboardStore((state) => state.clearSelections)

  const activePlan = useMemo(
    () =>
      isAuthenticated
        ? plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null
        : null,
    [isAuthenticated, plans, selectedPlanId]
  )

  useEffect(() => {
    if (isAuthenticated) {
      return
    }

    if (
      selectedPlanId !== null ||
      selectedStartPeriodId !== null ||
      selectedEndPeriodId !== null ||
      legacySelectedPeriodIds.length > 0
    ) {
      clearSelections()
    }
  }, [
    clearSelections,
    isAuthenticated,
    legacySelectedPeriodIds.length,
    selectedEndPeriodId,
    selectedPlanId,
    selectedStartPeriodId,
  ])

  useEffect(() => {
    if (!isAuthenticated || plansLoading || !activePlan) {
      return
    }

    if (activePlan.id !== selectedPlanId) {
      setSelectedPlanId(activePlan.id)
    }
  }, [
    activePlan,
    isAuthenticated,
    plansLoading,
    selectedPlanId,
    setSelectedPlanId,
  ])

  const {
    data: periods = [],
    isLoading: periodsLoading,
    isFetched: periodsFetched,
  } = usePeriods(activePlan)
  const sortedPeriods = useMemo(() => sortPeriods(periods), [periods])
  const legacyPeriodRange = useMemo(
    () => buildLegacyPeriodRange(legacySelectedPeriodIds),
    [legacySelectedPeriodIds]
  )

  useEffect(() => {
    if (!isAuthenticated || !activePlan || !periodsFetched || periodsLoading) {
      return
    }

    if (sortedPeriods.length === 0) {
      if (selectedStartPeriodId !== null || selectedEndPeriodId !== null) {
        setSelectedPeriodRange(EMPTY_PERIOD_RANGE)
      }
      return
    }

    const defaultPeriodId = findDefaultPeriod(sortedPeriods)?.id ?? null
    const requestedRange =
      selectedStartPeriodId || selectedEndPeriodId
        ? {
            startPeriodId: selectedStartPeriodId,
            endPeriodId: selectedEndPeriodId,
          }
        : legacyPeriodRange
    const normalizedRange = normalizePeriodRange(
      requestedRange,
      sortedPeriods,
      defaultPeriodId
    )

    if (
      !rangesEqual(normalizedRange, {
        startPeriodId: selectedStartPeriodId,
        endPeriodId: selectedEndPeriodId,
      })
    ) {
      setSelectedPeriodRange(normalizedRange)
    }
  }, [
    activePlan,
    isAuthenticated,
    legacyPeriodRange,
    periodsFetched,
    periodsLoading,
    selectedEndPeriodId,
    selectedStartPeriodId,
    setSelectedPeriodRange,
    sortedPeriods,
  ])

  const periodIndexMap = useMemo(
    () => new Map(sortedPeriods.map((period, index) => [period.id, index])),
    [sortedPeriods]
  )

  const setSelectedStartPeriodId = useCallback(
    (periodId: string) => {
      if (!periodIndexMap.has(periodId)) {
        return
      }

      setSelectedPeriodRange((current) => {
        const currentEndPeriodId =
          current.endPeriodId && periodIndexMap.has(current.endPeriodId)
            ? current.endPeriodId
            : periodId

        return {
          startPeriodId: periodId,
          endPeriodId:
            (periodIndexMap.get(periodId) ?? 0) >
            (periodIndexMap.get(currentEndPeriodId) ?? 0)
              ? periodId
              : currentEndPeriodId,
        }
      })
    },
    [periodIndexMap, setSelectedPeriodRange]
  )

  const setSelectedEndPeriodId = useCallback(
    (periodId: string) => {
      if (!periodIndexMap.has(periodId)) {
        return
      }

      setSelectedPeriodRange((current) => {
        const currentStartPeriodId =
          current.startPeriodId && periodIndexMap.has(current.startPeriodId)
            ? current.startPeriodId
            : periodId

        return {
          startPeriodId:
            (periodIndexMap.get(periodId) ?? 0) <
            (periodIndexMap.get(currentStartPeriodId) ?? 0)
              ? periodId
              : currentStartPeriodId,
          endPeriodId: periodId,
        }
      })
    },
    [periodIndexMap, setSelectedPeriodRange]
  )

  const selectedPeriods = useMemo(() => {
    if (!selectedStartPeriodId || !selectedEndPeriodId) {
      return []
    }

    const startIndex = sortedPeriods.findIndex(
      (period) => period.id === selectedStartPeriodId
    )
    const endIndex = sortedPeriods.findIndex(
      (period) => period.id === selectedEndPeriodId
    )

    if (startIndex === -1 || endIndex === -1) {
      return []
    }

    return sortedPeriods.slice(startIndex, endIndex + 1)
  }, [selectedEndPeriodId, selectedStartPeriodId, sortedPeriods])
  const selectedPeriodIds = useMemo(
    () => selectedPeriods.map((period) => period.id),
    [selectedPeriods]
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
      placeholderData: [] as Array<{
        id: string
        amount: number | string
        creditCardId: string
        creditCardName?: string | null
        periodId: string
      }>,
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
      label:
        participant.name ||
        (participant.role === "OWNER" ? "Owner" : "Parceiro"),
    }))
  }, [participants])

  const periodPanels = useMemo(
    () =>
      selectedPeriods.map((period, index) => {
        const transactions = (transactionQueries[index]?.data ??
          []) as Transaction[]
        const invoices = (invoiceQueries[index]?.data ?? []) as Array<{
          id: string
          amount: number | string
          creditCardId: string
          creditCardName?: string | null
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

    periodPanels.forEach((panel) => {
      panel.transactions
        .filter(
          (transaction) =>
            transaction.type === "EXPENSE" && !transaction.isClearedByInvoice
        )
        .forEach((transaction) => {
          const label = transaction.category?.name || "Sem categoria"
          totals.set(
            label,
            (totals.get(label) ?? 0) + Number(transaction.amount || 0)
          )
        })
    })

    const creditCardInvoicesTotal = periodPanels.reduce(
      (total, panel) =>
        total +
        panel.invoices.reduce(
          (invoiceTotal, invoice) => invoiceTotal + Number(invoice.amount || 0),
          0
        ),
      0
    )

    if (creditCardInvoicesTotal > 0) {
      totals.set(
        "Cartão de Crédito",
        (totals.get("Cartão de Crédito") ?? 0) + creditCardInvoicesTotal
      )
    }

    return [...totals.entries()]
      .map(([category, totalAmount]) => ({ category, totalAmount }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [periodPanels])

  const allTransactions = useMemo(
    () => periodPanels.flatMap((panel) => panel.transactions),
    [periodPanels]
  )

  const comparisonData = useMemo(
    () => buildComparisonChartData(periodPanels),
    [periodPanels]
  )
  const variation = useMemo(
    () => computeVariation(comparisonData),
    [comparisonData]
  )
  const { data: creditCards = [] } = useQuery(
    financeQueries.planCards(activePlan)
  )
  const { data: ownCreditCards = [] } = useOwnCreditCards()
  const { data: transactionCategories = [] } = useTransactionCategories()
  const isPlanOwner = Boolean(
    activePlan?.ownerId && user?.id && activePlan.ownerId === user.id
  )

  return {
    plans,
    plansLoading,
    periods: sortedPeriods,
    periodsLoading,
    selectedPlanId,
    activePlan,
    selectedPeriodIds,
    selectedStartPeriodId,
    selectedEndPeriodId,
    setSelectedPlanId,
    selectedPeriods,
    setSelectedStartPeriodId,
    setSelectedEndPeriodId,
    periodPanels,
    combinedStats,
    categorySpending,
    allTransactions,
    comparisonData,
    variation,
    creditCards,
    ownCreditCards,
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
            !responsibleFilter ||
            transaction.responsibleUserId === responsibleFilter
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
      ? getErrorMessage(
          profileMutation.error,
          "Não foi possível atualizar o perfil."
        )
      : null,
    passwordError: passwordMutation.error
      ? getErrorMessage(
          passwordMutation.error,
          "Não foi possível atualizar a senha."
        )
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
    const hasCurrentCard = creditCards.some(
      (card) => card.id === form.creditCardId
    )
    const hasCurrentPeriod = periods.some(
      (period) => period.id === form.periodId
    )
    const preferredPeriodId = selectedPeriodIds[0] || periods[0]?.id || ""

    return {
      ...form,
      creditCardId: hasCurrentCard
        ? form.creditCardId
        : creditCards[0]?.id || "",
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
  const resolvedCreateForm = useMemo(() => {
    const hasCurrentCard = creditCards.some(
      (card) => card.id === createForm.creditCardId
    )

    return {
      ...createForm,
      creditCardId: hasCurrentCard
        ? createForm.creditCardId
        : creditCards[0]?.id || "",
    }
  }, [createForm, creditCards])

  const invalidatePeriodInvoices = async () => {
    await queryClient.invalidateQueries({
      queryKey: financeKeys.periodInvoices(periodId),
    })
  }

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!resolvedCreateForm.creditCardId) {
        throw new Error("Selecione um cartão.")
      }

      const amountNumber = parseCurrencyInput(resolvedCreateForm.amount)
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor válido.")
      }

      return invoiceService.create({
        creditCardId: resolvedCreateForm.creditCardId,
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
    createForm: resolvedCreateForm,
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
      ? getErrorMessage(
          updateInvoice.error,
          "Não foi possível atualizar a fatura."
        )
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
  const [draft, setDraft] = useState("")
  const [mode, setMode] = useState<"create" | "edit">("create")

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

      await createMissingPeriodsForYear({
        financialPlanId: createdPlan.id,
        year: getCurrentYear(),
        periods: [],
      })

      return createdPlan
    },
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.plans }),
        response?.id
          ? queryClient.invalidateQueries({
              queryKey: financeKeys.periods(response.id),
            })
          : Promise.resolve(),
      ])
      if (response?.id) {
        onSelectPlanId(response.id)
      }
      setMode("create")
      setDraft("")
    },
  })

  return {
    draft,
    mode,
    setDraft,
    saveMutation,
    startCreate: () => {
      setMode("create")
      setDraft("")
    },
    startEdit: () => {
      setMode("edit")
      setDraft(activePlan?.name || "")
    },
    errorMessage: saveMutation.error
      ? getErrorMessage(saveMutation.error, "Não foi possível salvar o plano.")
      : null,
  }
}

export function usePlanYearManager(activePlan: Plan | null, periods: Period[]) {
  const queryClient = useQueryClient()
  const activePlanId = activePlan?.id ?? null
  const suggestedYear = useMemo(() => getSuggestedNextYear(periods), [periods])
  // Keep the year draft keyed by plan id so changing plans resets the visible
  // value without triggering a setState from inside an effect. Do not
  // reintroduce this with useEffect(setState), because it causes cascading
  // renders and trips the React lint rule.
  const [draftYearState, setDraftYearState] = useState(() => ({
    planId: activePlanId,
    value: suggestedYear,
  }))
  const draftYear =
    draftYearState.planId === activePlanId
      ? draftYearState.value
      : suggestedYear
  const setDraftYear = (value: number) =>
    setDraftYearState({
      planId: activePlanId,
      value,
    })

  const addYearMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Selecione um plano antes de adicionar um ano.")
      }

      const year = Number(draftYear)
      if (!Number.isInteger(year) || year < 2000) {
        throw new Error("Informe um ano válido.")
      }

      const createdCount = await createMissingPeriodsForYear({
        financialPlanId: activePlan.id,
        year,
        periods,
      })

      if (createdCount === 0) {
        throw new Error(`O ano ${year} já possui todos os 12 meses.`)
      }

      return { year, createdCount }
    },
    onSuccess: async ({ year }) => {
      setDraftYearState({
        planId: activePlanId,
        value: year + 1,
      })
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periods(activePlan?.id),
      })
    },
  })
  const deleteYearMutation = useMutation({
    mutationFn: async (year: number) => {
      if (!activePlan?.id) {
        throw new Error("Selecione um plano antes de excluir um ano.")
      }

      const periodsForYear = periods.filter((period) => period.year === year)
      if (periodsForYear.length === 0) {
        throw new Error(`O ano ${year} não existe neste plano.`)
      }

      await Promise.all(
        periodsForYear.map((period) => periodService.delete(period.id))
      )

      return { year }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periods(activePlan?.id),
      })
    },
  })

  return {
    draftYear,
    setDraftYear,
    suggestedYear,
    addYearMutation,
    deleteYearMutation,
    errorMessage: addYearMutation.error
      ? getErrorMessage(
          addYearMutation.error,
          "Não foi possível adicionar o ano ao plano."
        )
      : null,
    deleteYearErrorMessage: deleteYearMutation.error
      ? getErrorMessage(
          deleteYearMutation.error,
          "Não foi possível excluir o ano do plano."
        )
      : null,
    resetDraft: () =>
      setDraftYearState({
        planId: activePlanId,
        value: getSuggestedNextYear(periods),
      }),
  }
}

export function usePlanDeleteManager({
  activePlan,
  plans,
  onSelectPlanId,
}: {
  activePlan: Plan | null
  plans: Plan[]
  onSelectPlanId: (id: string | null) => void
}) {
  const queryClient = useQueryClient()

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Selecione um plano antes de excluir.")
      }

      await planService.delete(activePlan.id)
      return activePlan.id
    },
    onSuccess: async (deletedPlanId) => {
      const nextPlanId =
        plans.find((plan) => plan.id !== deletedPlanId)?.id ?? null

      onSelectPlanId(nextPlanId)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.plans }),
        queryClient.invalidateQueries({
          queryKey: financeKeys.periods(deletedPlanId),
        }),
      ])
    },
  })

  return {
    deletePlanMutation,
    errorMessage: deletePlanMutation.error
      ? getErrorMessage(
          deletePlanMutation.error,
          "Não foi possível excluir o plano."
        )
      : null,
  }
}

export function usePeriodsManager(activePlan: Plan | null) {
  const queryClient = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [draft, setDraft] = useState({
    month: new Date().getMonth() + 1,
    year: currentYear,
  })

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
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periods(activePlan?.id),
      })
    },
  })

  return {
    draft,
    setDraft,
    saveMutation,
    errorMessage: saveMutation.error
      ? getErrorMessage(
          saveMutation.error,
          "Não foi possível salvar o período."
        )
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
      queryClient.invalidateQueries({
        queryKey: financeKeys.participants(activePlan?.id),
      }),
      queryClient.invalidateQueries({
        queryKey: financeKeys.inviteLink(activePlan?.id),
      }),
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
        throw new Error("Plano inválido.")
      }

      await planService.revokeInviteLink(activePlan.id)
    },
    onSuccess: invalidatePlanCollaboration,
  })

  const removeParticipant = useMutation({
    mutationFn: async (userId: string) => {
      if (!activePlan?.id) {
        throw new Error("Plano inválido.")
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
      ? getErrorMessage(
          rotateInviteLink.error,
          "Não foi possível gerar o link de convite."
        )
      : revokeInviteLink.error
        ? getErrorMessage(
            revokeInviteLink.error,
            "Não foi possível revogar o link de convite."
          )
        : removeParticipant.error
          ? getErrorMessage(
              removeParticipant.error,
              "Não foi possível remover o participante."
            )
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
      ? getErrorMessage(
          createMutation.error,
          "Não foi possível salvar a categoria."
        )
      : null,
  }
}

export function useTransactionMutations(
  periodId: string,
  periods: Period[] = []
) {
  const queryClient = useQueryClient()

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: financeKeys.periodTransactions(periodId),
      }),
      queryClient.invalidateQueries({
        queryKey: financeKeys.periodInvoices(periodId),
      }),
      queryClient.invalidateQueries({
        queryKey: financeKeys.categoryReport(periodId),
      }),
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
        queryClient.invalidateQueries({
          queryKey: financeKeys.periodTransactionsRoot,
        }),
        queryClient.invalidateQueries({
          queryKey: ["report-spending-by-category"],
        }),
        queryClient.invalidateQueries({
          queryKey: financeKeys.periodInvoices(periodId),
        }),
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

      const periodById = new Map(periods.map((period) => [period.id, period]))
      const recurringTransactions = transactionsByPeriod
        .flatMap((transactions, index) =>
          transactions.map((transaction) => ({
            period: periods[index],
            transaction,
          }))
        )
        .filter(
          ({ transaction }) => transaction.recurringGroupId === recurringGroupId
        )

      if (recurringTransactions.length === 0) {
        throw new Error(
          "Nenhuma transação recorrente encontrada para este grupo."
        )
      }

      await Promise.all(
        recurringTransactions.map(({ transaction, period }) =>
          transactionService.updatePartial(
            transaction.id,
            buildRecurringGroupPayload({
              transaction,
              basePayload: normalizedPayload,
              anchorDueDate: normalizedPayload.dueDate,
              period: period ?? periodById.get(transaction.periodId),
              currentTransactionId: id,
            })
          )
        )
      )

      return recurringTransactions.map(({ transaction }) => transaction)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: financeKeys.periodTransactionsRoot,
        }),
        queryClient.invalidateQueries({
          queryKey: ["report-spending-by-category"],
        }),
        queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
      ])
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: async (
      variables:
        | string
        | {
            id: string
            recurringGroupId?: string | null
            deleteScope?: "SINGLE" | "GROUP"
          }
    ) => {
      const id = typeof variables === "string" ? variables : variables.id
      const recurringGroupId =
        typeof variables === "string" ? null : variables.recurringGroupId
      const deleteScope =
        typeof variables === "string"
          ? "SINGLE"
          : variables.deleteScope ?? "SINGLE"

      if (deleteScope !== "GROUP" || !recurringGroupId) {
        await transactionService.delete(id)
        return { deleteScope: "SINGLE" as const }
      }

      const transactionsByPeriod = await Promise.all(
        periods.map((period) => periodService.getTransactionsByPeriod(period))
      )

      const recurringTransactions = transactionsByPeriod
        .flat()
        .filter(
          (transaction) => transaction.recurringGroupId === recurringGroupId
        )

      if (recurringTransactions.length === 0) {
        throw new Error(
          "Nenhuma transação recorrente encontrada para este grupo."
        )
      }

      await Promise.all(
        recurringTransactions.map((transaction) =>
          transactionService.delete(transaction.id)
        )
      )

      return { deleteScope: "GROUP" as const }
    },
    onSuccess: async (result) => {
      if (result.deleteScope === "GROUP") {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: financeKeys.periodTransactionsRoot,
          }),
          queryClient.invalidateQueries({
            queryKey: ["period-invoices"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["report-spending-by-category"],
          }),
          queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
        ])
        return
      }

      await invalidate()
    },
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
  const [paymentModalEntry, setPaymentModalEntry] =
    useState<Transaction | null>(null)
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
      ? getErrorMessage(
          linkTransactionToInvoice.error,
          "Não foi possível vincular a transação."
        )
      : null,
  }
}
