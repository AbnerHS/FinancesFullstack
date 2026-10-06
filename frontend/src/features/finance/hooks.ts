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
  addDaysIso,
  addMonthsToDate,
  buildPlanMonths,
  calculateStats,
  findDefaultPeriod,
  formatMonthYear,
  monthsBetween,
  parseCurrencyInput,
  shiftPeriod,
  todayIso,
  weekBounds,
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

/**
 * Payload de uma ocorrência ao editar o grupo recorrente inteiro. A ocorrência editada recebe o
 * payload como veio; as demais não herdam o pagamento e mantêm a distância entre vencimento e
 * competência (o vencimento anda junto com o mês de cada ocorrência).
 */
function buildRecurringGroupPayload({
  transaction,
  anchor,
  basePayload,
}: {
  transaction: Transaction
  anchor: Transaction
  basePayload: Record<string, unknown>
}) {
  if (transaction.id === anchor.id) {
    return basePayload
  }

  const groupPayload = { ...basePayload }
  delete groupPayload.paymentDate
  delete groupPayload.paymentStatus

  if (!Object.prototype.hasOwnProperty.call(basePayload, "dueDate")) {
    return groupPayload
  }

  const anchorDueDate = basePayload.dueDate
  groupPayload.dueDate =
    typeof anchorDueDate === "string" && anchorDueDate
      ? addMonthsToDate(
          anchorDueDate,
          monthsBetween(anchor.referenceDate, transaction.referenceDate)
        )
      : null
  return groupPayload
}

/**
 * Intervalo válido dentro de `periods`. Sem seleção: os últimos 12 meses até o mês atual, sem os
 * meses vazios do começo (plano novo não abre com meses zerados puxando as médias para baixo).
 */
function normalizePeriodRange(
  range: PeriodRange,
  periods: Period[],
  monthsWithData: string[]
) {
  if (periods.length === 0) {
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

  if (!startCandidate && !endCandidate) {
    const currentIndex = Math.max(
      periodIds.indexOf(findDefaultPeriod(periods)?.id ?? ""),
      0
    )
    const firstDataIndex = periodIds.findIndex((id) => monthsWithData.includes(id))
    const startIndex = Math.min(
      Math.max(currentIndex - 11, firstDataIndex, 0),
      currentIndex
    )
    return {
      startPeriodId: periodIds[startIndex],
      endPeriodId: periodIds[currentIndex],
    }
  }

  const nextStartPeriodId = (startCandidate ?? endCandidate)!
  const nextEndPeriodId = (endCandidate ?? startCandidate)!

  return periodIds.indexOf(nextStartPeriodId) <= periodIds.indexOf(nextEndPeriodId)
    ? { startPeriodId: nextStartPeriodId, endPeriodId: nextEndPeriodId }
    : { startPeriodId: nextEndPeriodId, endPeriodId: nextStartPeriodId }
}

export function usePlans() {
  const isAuthenticated = Boolean(useAuthStore((state) => state.user?.id))
  return useQuery({
    ...financeQueries.plans(),
    enabled: isAuthenticated,
  })
}

/** Meses do plano que têm lançamentos, com totais. */
export function usePlanMonths(plan: Plan | null) {
  return useQuery(financeQueries.months(plan))
}

/** Meses selecionáveis do plano (gerados no cliente; não existem mais períodos no backend). */
export function usePeriods(plan: Plan | null) {
  const { data: monthSummaries, isLoading, isFetched } = usePlanMonths(plan)
  const data = useMemo(
    () =>
      plan
        ? buildPlanMonths(
            plan.id,
            (monthSummaries ?? []).map((summary) => summary.month)
          )
        : [],
    [monthSummaries, plan]
  )

  return { data, monthSummaries: monthSummaries ?? [], isLoading, isFetched }
}

/** Invalida tudo que depende das transações de um plano (podem mudar de mês ao vincular fatura). */
async function invalidateTransactionViews(
  queryClient: ReturnType<typeof useQueryClient>,
  planId: string | null | undefined
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: financeKeys.periodTransactionsRoot,
    }),
    queryClient.invalidateQueries({ queryKey: financeKeys.periodInvoicesRoot }),
    queryClient.invalidateQueries({ queryKey: financeKeys.months(planId) }),
    queryClient.invalidateQueries({ queryKey: financeKeys.categories }),
  ])
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

/**
 * Contexto comum das telas do plano: planos, plano ativo, meses selecionáveis, participantes,
 * cartões e categorias. Não busca transações (cada tela decide quais meses carregar).
 */
export function usePlanContext() {
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
  const setSelectedPlanId = useDashboardStore(
    (state) => state.setSelectedPlanId
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
      selectedEndPeriodId !== null
    ) {
      clearSelections()
    }
  }, [
    clearSelections,
    isAuthenticated,
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

  // Já vêm em ordem cronológica.
  const {
    data: periods,
    monthSummaries,
    isLoading: periodsLoading,
    isFetched: periodsFetched,
  } = usePeriods(activePlan)
  const defaultMonthId = useMemo(
    () => findDefaultPeriod(periods)?.id ?? null,
    [periods]
  )

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
    activePlan,
    selectedPlanId,
    setSelectedPlanId,
    periods,
    monthSummaries,
    periodsLoading,
    periodsFetched,
    defaultMonthId,
    participants,
    responsibleOptions,
    creditCards,
    ownCreditCards,
    transactionCategories,
    isPlanOwner,
    isAuthenticated,
    userId: user?.id ?? null,
  }
}

export type PeriodPanel = PeriodPanelData

/** Transações e faturas de cada mês (uma query por mês, cache compartilhado entre as telas). */
// Meses já vistos ficam no cache do navegador por 30 min depois de saírem da janela do carrossel
// (o padrão do React Query descarta em 5 min) e só são rebuscados em segundo plano depois de 5 min;
// as mutações invalidam o que mudou.
const MONTH_STALE_TIME = 1000 * 60 * 5
const MONTH_GC_TIME = 1000 * 60 * 30

export function usePeriodPanels(periods: Period[]) {
  const transactionQueries = useQueries({
    queries: periods.map((period) => ({
      queryKey: financeKeys.periodTransactions(period),
      queryFn: () => periodService.getTransactionsByPeriod(period),
      staleTime: MONTH_STALE_TIME,
      gcTime: MONTH_GC_TIME,
      placeholderData: [] as Transaction[],
    })),
  })

  const invoiceQueries = useQueries({
    queries: periods.map((period) => ({
      queryKey: financeKeys.periodInvoices(period),
      queryFn: () => periodService.getInvoicesByPeriod(period),
      staleTime: MONTH_STALE_TIME,
      gcTime: MONTH_GC_TIME,
      placeholderData: [] as Invoice[],
    })),
  })

  return useMemo(
    () =>
      periods.map((period, index): PeriodPanelData => {
        const transactionQuery = transactionQueries[index]
        const invoiceQuery = invoiceQueries[index]
        const transactions = (transactionQuery?.data ?? []) as Transaction[]
        const invoices = (invoiceQuery?.data ?? []) as Invoice[]

        return {
          period,
          label: formatMonthYear(period),
          invoices,
          transactions,
          stats: calculateStats(
            transactions,
            invoices.reduce((total, invoice) => total + Number(invoice.amount || 0), 0)
          ),
          // Com placeholderData a query não fica "isLoading": o vazio provisório é o carregamento.
          transactionsLoading: Boolean(
            transactionQuery?.isLoading || transactionQuery?.isPlaceholderData
          ),
          invoicesLoading: Boolean(invoiceQuery?.isLoading || invoiceQuery?.isPlaceholderData),
        }
      }),
    [invoiceQueries, periods, transactionQueries]
  )
}

type PeriodPanelData = {
  period: Period
  label: string
  invoices: Invoice[]
  transactions: Transaction[]
  stats: { incomes: number; expenses: number; balance: number }
  transactionsLoading: boolean
  invoicesLoading: boolean
}

/**
 * Dashboard: um mês por vez, sem limite de intervalo. Carrega o mês ativo e WINDOW_RADIUS meses de
 * cada lado (numa requisição só, ver loadMonthData): swipes seguidos não batem na borda antes de
 * o carrossel parar e a janela se recentrar no mês em que parou.
 * Sem mês escolhido na sessão, abre no mês atual.
 */
const WINDOW_RADIUS = 6

export function useDashboard() {
  const context = usePlanContext()
  const { activePlan } = context
  const selectedMonthId = useDashboardStore((state) => state.selectedMonthId)
  const setSelectedMonthId = useDashboardStore((state) => state.setSelectedMonthId)

  const currentMonthId = todayIso().slice(0, 7)
  const activeMonthId =
    selectedMonthId && /^\d{4}-\d{2}$/.test(selectedMonthId) ? selectedMonthId : currentMonthId

  const activePeriod = useMemo<Period | null>(() => {
    if (!activePlan) return null
    const [year, month] = activeMonthId.split("-").map(Number)
    return { id: activeMonthId, planId: activePlan.id, year, month }
  }, [activeMonthId, activePlan])
  const windowPeriods = useMemo(
    () =>
      activePeriod
        ? Array.from({ length: WINDOW_RADIUS * 2 + 1 }, (_, index) =>
            shiftPeriod(activePeriod, index - WINDOW_RADIUS)
          )
        : [],
    [activePeriod]
  )
  const periodPanels = usePeriodPanels(windowPeriods)

  return {
    ...context,
    activePeriod,
    goToCurrentMonth: () => setSelectedMonthId(currentMonthId),
    setSelectedMonthId,
    periodPanels,
  }
}

/** Tela de evolução: intervalo De/Até (salvo no navegador) com os meses carregados. */
export function useEvolution() {
  const context = usePlanContext()
  const {
    activePlan,
    periods,
    monthSummaries,
    periodsFetched,
    periodsLoading,
    isAuthenticated,
  } = context
  const selectedStartPeriodId = useDashboardStore(
    (state) => state.selectedStartPeriodId
  )
  const selectedEndPeriodId = useDashboardStore(
    (state) => state.selectedEndPeriodId
  )
  const setSelectedPeriodRange = useDashboardStore(
    (state) => state.setSelectedPeriodRange
  )

  useEffect(() => {
    if (!isAuthenticated || !activePlan || !periodsFetched || periodsLoading) {
      return
    }

    if (periods.length === 0) {
      if (selectedStartPeriodId !== null || selectedEndPeriodId !== null) {
        setSelectedPeriodRange(EMPTY_PERIOD_RANGE)
      }
      return
    }

    const normalizedRange = normalizePeriodRange(
      { startPeriodId: selectedStartPeriodId, endPeriodId: selectedEndPeriodId },
      periods,
      monthSummaries.map((summary) => summary.month)
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
    periodsFetched,
    periodsLoading,
    selectedEndPeriodId,
    selectedStartPeriodId,
    setSelectedPeriodRange,
    periods,
    monthSummaries,
  ])

  const periodIndexMap = useMemo(
    () => new Map(periods.map((period, index) => [period.id, index])),
    [periods]
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

  /** Define início e fim de uma vez (atalhos de período), ignorando meses fora da lista. */
  const setSelectedRange = useCallback(
    (startPeriodId: string, endPeriodId: string) => {
      if (!periodIndexMap.has(startPeriodId) || !periodIndexMap.has(endPeriodId)) {
        return
      }
      setSelectedPeriodRange({ startPeriodId, endPeriodId })
    },
    [periodIndexMap, setSelectedPeriodRange]
  )

  const selectedPeriods = useMemo(() => {
    const startIndex = selectedStartPeriodId
      ? (periodIndexMap.get(selectedStartPeriodId) ?? -1)
      : -1
    const endIndex = selectedEndPeriodId
      ? (periodIndexMap.get(selectedEndPeriodId) ?? -1)
      : -1
    return startIndex === -1 || endIndex === -1
      ? []
      : periods.slice(startIndex, endIndex + 1)
  }, [periodIndexMap, periods, selectedEndPeriodId, selectedStartPeriodId])

  const periodPanels = usePeriodPanels(selectedPeriods)

  return {
    ...context,
    selectedStartPeriodId,
    selectedEndPeriodId,
    selectedPeriods,
    setSelectedStartPeriodId,
    setSelectedEndPeriodId,
    setSelectedRange,
    periodPanels,
  }
}

/**
 * Dados extras do resumo do mês ativo: o mês anterior (para variação) e, quando o mês ativo é o
 * atual, os vencimentos da semana e as contas atrasadas. Reusa as mesmas chaves de cache do painel.
 */
export function useMonthSummaryData({ activePeriod }: { activePeriod: Period | null }) {
  const previousPeriod = useMemo(
    () => (activePeriod ? shiftPeriod(activePeriod, -1) : null),
    [activePeriod]
  )

  const previousTransactions = useQuery({
    queryKey: financeKeys.periodTransactions(previousPeriod),
    queryFn: () => periodService.getTransactionsByPeriod(previousPeriod),
    enabled: Boolean(previousPeriod),
    staleTime: MONTH_STALE_TIME,
    gcTime: MONTH_GC_TIME,
  })
  const previousInvoices = useQuery({
    queryKey: financeKeys.periodInvoices(previousPeriod),
    queryFn: () => periodService.getInvoicesByPeriod(previousPeriod),
    enabled: Boolean(previousPeriod),
    staleTime: MONTH_STALE_TIME,
    gcTime: MONTH_GC_TIME,
  })

  const today = todayIso()
  const isCurrentMonth = Boolean(activePeriod && today.startsWith(activePeriod.id))
  const planId = activePeriod?.planId ?? null
  const week = weekBounds(today)
  const weekFilter = { dueFrom: week.from, dueTo: week.to }
  const overdueFilter = {
    dueTo: addDaysIso(today, -1),
    paymentStatus: "PENDING" as const,
  }

  const weekTransactions = useQuery({
    queryKey: financeKeys.transactionsByDue(planId, weekFilter),
    queryFn: () => periodService.getTransactionsByDue(planId!, weekFilter),
    enabled: Boolean(planId && isCurrentMonth),
    staleTime: 1000 * 60 * 2,
  })
  const overdueTransactions = useQuery({
    queryKey: financeKeys.transactionsByDue(planId, overdueFilter),
    queryFn: () => periodService.getTransactionsByDue(planId!, overdueFilter),
    enabled: Boolean(planId && isCurrentMonth),
    staleTime: 1000 * 60 * 2,
  })

  return {
    previousPeriod,
    previousTransactions: previousTransactions.data ?? null,
    previousInvoices: previousInvoices.data ?? null,
    isCurrentMonth,
    weekTransactions: weekTransactions.data ?? [],
    overdueTransactions: overdueTransactions.data ?? [],
    weekLoading: weekTransactions.isLoading || overdueTransactions.isLoading,
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
      const period = periods.find((item) => item.id === resolvedForm.periodId)
      if (!period) {
        throw new Error("Selecione o mês.")
      }

      const amountNumber = parseCurrencyInput(resolvedForm.amount)
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor válido.")
      }

      return invoiceService.create({
        planId: period.planId,
        creditCardId: resolvedForm.creditCardId,
        referenceMonth: period.id,
        amount: amountNumber,
      })
    },
    onSuccess: async () => {
      setForm((current) => ({ ...current, amount: "" }))
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periodInvoicesRoot,
      })
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
  period,
}: {
  creditCards: CreditCard[]
  invoices: Invoice[]
  period: Period
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
      queryKey: financeKeys.periodInvoices(period),
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
        planId: period.planId,
        creditCardId: resolvedCreateForm.creditCardId,
        referenceMonth: period.id,
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
        referenceMonth: invoice.referenceMonth,
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

      // Sem períodos para criar: os meses do plano ficam disponíveis direto.
      return planService.create({ name })
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: financeKeys.plans })
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
          queryKey: financeKeys.months(deletedPlanId),
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

export function useTransactionMutations(period: Period) {
  const queryClient = useQueryClient()
  const invalidate = () => invalidateTransactionViews(queryClient, period.planId)

  const loadRecurringGroup = async (recurringGroupId: string) => {
    const group = await periodService.getRecurringGroup(
      period.planId,
      recurringGroupId
    )
    if (group.length === 0) {
      throw new Error("Nenhuma transação recorrente encontrada para este grupo.")
    }
    return group
  }

  const createTransaction = useMutation({
    mutationFn: transactionService.create,
    onSuccess: invalidate,
  })

  const createRecurringTransaction = useMutation({
    mutationFn: transactionService.createRecurring,
    onSuccess: invalidate,
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

      const group = await loadRecurringGroup(recurringGroupId)
      const anchor = group.find((transaction) => transaction.id === id)
      if (!anchor) {
        throw new Error("A transação editada não pertence ao grupo recorrente.")
      }

      await Promise.all(
        group.map((transaction) =>
          transactionService.updatePartial(
            transaction.id,
            buildRecurringGroupPayload({
              transaction,
              anchor,
              basePayload: normalizedPayload,
            })
          )
        )
      )

      return group
    },
    onSuccess: invalidate,
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
        return
      }

      const group = await loadRecurringGroup(recurringGroupId)
      await Promise.all(
        group.map((transaction) => transactionService.delete(transaction.id))
      )
    },
    onSuccess: invalidate,
  })

  return {
    createTransaction,
    createRecurringTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export function useTransactionLinking(period: Period) {
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

  // Vincular move a transação para o mês da fatura (regra da API), então outros meses mudam.
  const invalidate = () => invalidateTransactionViews(queryClient, period.planId)

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
      await invalidate()
    },
  })

  const unlinkTransactionFromInvoice = useMutation({
    mutationFn: async (transactionId: string) =>
      transactionService.updatePartial(transactionId, {
        isClearedByInvoice: false,
        creditCardInvoiceId: null,
      }),
    onSuccess: invalidate,
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
