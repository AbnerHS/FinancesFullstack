import type {
  CategorySpending,
  PaymentStatus,
  Period,
  Transaction,
  TransactionType,
} from "@/features/finance/types.ts"

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const

export function formatMonthLabel(month: number | null | undefined) {
  if (!month || month < 1 || month > 12) {
    return ""
  }

  return MONTH_LABELS[month - 1]
}

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function formatMonthYear(period: Period | null | undefined) {
  if (!period) {
    return ""
  }

  return `${formatMonthLabel(period.month).toLowerCase()}/${period.year}`
}

const pad = (value: number, size = 2) => String(value).padStart(size, "0")

export function toMonthId(year: number, month: number) {
  return `${pad(year, 4)}-${pad(month)}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** Meses selecionáveis: do ano anterior ao seguinte, ampliado pelos anos que têm lançamentos. */
export function buildPlanMonths(planId: string, monthsWithData: string[]): Period[] {
  const currentYear = new Date().getFullYear()
  const dataYears = monthsWithData.map((month) => Number(month.slice(0, 4)))
  const firstYear = Math.min(currentYear - 1, ...dataYears)
  const lastYear = Math.max(currentYear + 1, ...dataYears)

  const months: Period[] = []
  for (let year = firstYear; year <= lastYear; year++) {
    for (let month = 1; month <= 12; month++) {
      months.push({ id: toMonthId(year, month), planId, year, month })
    }
  }
  return months
}

/** Mesmo mês/dia em outro mês, limitando o dia ao fim do mês (31/01 → 28/02). */
export function moveDateToMonth(date: string, year: number, month: number) {
  const day = Number(date.slice(8, 10)) || 1
  return `${toMonthId(year, month)}-${pad(Math.min(day, daysInMonth(year, month)))}`
}

/** Soma meses a uma data AAAA-MM-DD, limitando o dia ao fim do mês. */
export function addMonthsToDate(date: string, months: number) {
  const [year, month] = date.split("-").map(Number)
  const total = year * 12 + (month - 1) + months
  return moveDateToMonth(date, Math.floor(total / 12), (total % 12) + 1)
}

/** Diferença em meses entre duas datas/meses (AAAA-MM...). */
export function monthsBetween(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number)
  const [toYear, toMonth] = to.split("-").map(Number)
  return (toYear - fromYear) * 12 + (toMonth - fromMonth)
}

/**
 * Data de competência para uma transação criada no painel do mês: o vencimento se cair no mês,
 * senão hoje se for o mês atual, senão o dia 1º.
 */
export function defaultReferenceDate(period: Period, dueDate?: string | null) {
  if (dueDate?.startsWith(period.id)) {
    return dueDate
  }

  const today = new Date()
  if (today.getFullYear() === period.year && today.getMonth() + 1 === period.month) {
    return `${period.id}-${pad(today.getDate())}`
  }

  return `${period.id}-01`
}

export function findDefaultPeriod(periods: Period[]) {
  if (periods.length === 0) {
    return null
  }

  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  return (
    periods.find(
      (period) => period.month === currentMonth && period.year === currentYear
    ) ?? periods[periods.length - 1]
  )
}

export function formatCurrencyInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) {
    return ""
  }

  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCurrencyInput(value: string) {
  const normalized = String(value || "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".")
  if (!normalized) {
    return Number.NaN
  }
  return Number(normalized)
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return ""
  }

  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) {
    return value
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return ""
  }

  const normalizedValue = value.replace(" ", "T")
  const parsedDate = new Date(normalizedValue)
  if (Number.isFinite(parsedDate.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(parsedDate)
  }

  const match = normalizedValue.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
  )
  if (!match) {
    return value
  }

  const [, year, month, day, hour, minute] = match
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(
    new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    )
  )
}

export type DueAlertLevel = "none" | "dueSoon" | "overdue"

function parseDateOnly(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getTransactionDueAlert(transaction: {
  type: TransactionType
  dueDate?: string | null
  paymentStatus?: PaymentStatus | null
}) {
  if (
    transaction.type !== "EXPENSE" ||
    !transaction.dueDate ||
    transaction.paymentStatus === "PAID"
  ) {
    return "none" satisfies DueAlertLevel
  }

  const dueDate = parseDateOnly(transaction.dueDate)
  if (!dueDate) {
    return "none" satisfies DueAlertLevel
  }

  const today = normalizeDate(new Date())
  const normalizedDueDate = normalizeDate(dueDate)
  const diffInDays = Math.round(
    (normalizedDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffInDays < 0) {
    return "overdue" satisfies DueAlertLevel
  }

  if (diffInDays <= 7) {
    return "dueSoon" satisfies DueAlertLevel
  }

  return "none" satisfies DueAlertLevel
}

export function buildComparisonChartData(
  panels: Array<{
    period: Period
    label: string
    stats: { incomes: number; expenses: number; balance: number }
  }>
) {
  return panels.map((panel) => ({
    id: panel.period.id,
    label: panel.label,
    incomes: panel.stats.incomes,
    expenses: panel.stats.expenses,
    balance: panel.stats.balance,
  }))
}

export function buildCategoryChartData({
  categorySpending,
  filteredTransactions,
  responsibleFilter,
}: {
  categorySpending: CategorySpending[]
  filteredTransactions: Transaction[]
  responsibleFilter: string
}) {
  if (!responsibleFilter) {
    return categorySpending
  }

  const totals = new Map<string, number>()
  filteredTransactions
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

  return [...totals.entries()]
    .map(([category, totalAmount]) => ({ category, totalAmount }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
}

export function computeVariation(items: Array<{ balance: number }>) {
  if (items.length < 2) {
    return null
  }

  const previous = Number(items[0]?.balance || 0)
  const current = Number(items[items.length - 1]?.balance || 0)

  if (previous === 0) {
    return current === 0 ? 0 : 100
  }

  return ((current - previous) / Math.abs(previous)) * 100
}

export function calculateStats(
  transactions: Transaction[],
  invoicesAmount: number
) {
  const incomes = transactions
    .filter((transaction) => transaction.type === "REVENUE")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)

  const expensesFromTransactions = transactions
    .filter(
      (transaction) =>
        transaction.type === "EXPENSE" && !transaction.isClearedByInvoice
    )
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)

  const expenses = expensesFromTransactions + invoicesAmount

  return {
    incomes,
    expenses,
    balance: incomes - expenses,
  }
}

export function toneForBalance(value: number): TransactionType | "NEUTRAL" {
  if (value > 0) {
    return "REVENUE"
  }
  if (value < 0) {
    return "EXPENSE"
  }
  return "NEUTRAL"
}

// ---------------------------------------------------------------------------------------------
// Resumo do mês / semana

/** Data local de hoje em AAAA-MM-DD (sem fuso: o app trabalha com datas de calendário). */
export function todayIso(today = new Date()) {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

export function addDaysIso(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number)
  return todayIso(new Date(year, month - 1, day + days))
}

/** Segunda e domingo da semana de `date` (AAAA-MM-DD). */
export function weekBounds(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  const weekday = new Date(year, month - 1, day).getDay() // 0 = domingo
  const monday = addDaysIso(date, weekday === 0 ? -6 : 1 - weekday)
  return { from: monday, to: addDaysIso(monday, 6) }
}

/** Variação percentual; null quando não há base de comparação. */
export function percentChange(current: number, previous: number | null | undefined) {
  if (previous == null || previous === 0) {
    return null
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

const isCountedExpense = (transaction: Transaction) =>
  transaction.type === "EXPENSE" && !transaction.isClearedByInvoice

export type MonthInsights = {
  incomes: number
  expenses: number
  balance: number
  /** Saldo ÷ receitas (null sem receitas). */
  savingsRate: number | null
  /** Despesas ÷ receitas (null sem receitas). */
  committedRate: number | null
  incomesChange: number | null
  expensesChange: number | null
  bills: {
    paidTotal: number
    pendingTotal: number
    paidCount: number
    pendingCount: number
    overdueCount: number
    overdueTotal: number
    /** Fração paga do total com vencimento (0–1), null sem contas. */
    paidRatio: number | null
  }
  /** Mês atual: saldo disponível por dia até o fim do mês; outros meses: gasto médio por dia. */
  daily: { kind: "available" | "average"; value: number; days: number }
  topCategory: { name: string; total: number; share: number } | null
  invoices: { total: number; share: number | null; count: number }
  byResponsible: Array<{ id: string; label: string; total: number; share: number }>
}

export function buildMonthInsights({
  period,
  stats,
  transactions,
  invoices,
  previousStats,
  responsibleOptions,
  today = todayIso(),
}: {
  period: Period
  stats: { incomes: number; expenses: number; balance: number }
  transactions: Transaction[]
  invoices: Array<{ amount: number | string }>
  previousStats: { incomes: number; expenses: number } | null
  responsibleOptions: Array<{ id: string; label: string }>
  today?: string
}): MonthInsights {
  const { incomes, expenses, balance } = stats

  const bills = transactions.filter((t) => isCountedExpense(t) && t.dueDate)
  const paid = bills.filter((t) => t.paymentStatus === "PAID")
  const pending = bills.filter((t) => t.paymentStatus !== "PAID")
  const overdue = pending.filter((t) => getTransactionDueAlert(t) === "overdue")
  const sum = (items: Array<{ amount: number | string }>) =>
    items.reduce((total, item) => total + Number(item.amount || 0), 0)
  const paidTotal = sum(paid)
  const pendingTotal = sum(pending)

  const monthDays = daysInMonth(period.year, period.month)
  const isCurrentMonth = today.startsWith(period.id)
  const remainingDays = isCurrentMonth ? monthDays - Number(today.slice(8, 10)) + 1 : 0
  const daily = isCurrentMonth
    ? { kind: "available" as const, value: Math.max(balance, 0) / remainingDays, days: remainingDays }
    : { kind: "average" as const, value: expenses / monthDays, days: monthDays }

  const categoryTotals = new Map<string, number>()
  transactions.filter(isCountedExpense).forEach((t) => {
    const name = t.category?.name || "Sem categoria"
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + Number(t.amount || 0))
  })
  const [topName, topTotal] =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0] ?? []

  const invoicesTotal = sum(invoices)

  const responsibleTotals = new Map<string, number>()
  transactions.filter(isCountedExpense).forEach((t) => {
    const id = t.responsibleUserId || ""
    responsibleTotals.set(id, (responsibleTotals.get(id) ?? 0) + Number(t.amount || 0))
  })
  const responsibleExpenses = [...responsibleTotals.values()].reduce((a, b) => a + b, 0)
  const byResponsible = [...responsibleTotals.entries()]
    .map(([id, total]) => ({
      id: id || "__unassigned__",
      label: responsibleOptions.find((option) => option.id === id)?.label || "Geral",
      total,
      share: responsibleExpenses > 0 ? total / responsibleExpenses : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return {
    incomes,
    expenses,
    balance,
    savingsRate: incomes > 0 ? balance / incomes : null,
    committedRate: incomes > 0 ? expenses / incomes : null,
    incomesChange: percentChange(incomes, previousStats?.incomes),
    expensesChange: percentChange(expenses, previousStats?.expenses),
    bills: {
      paidTotal,
      pendingTotal,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      overdueTotal: sum(overdue),
      paidRatio: paidTotal + pendingTotal > 0 ? paidTotal / (paidTotal + pendingTotal) : null,
    },
    daily,
    topCategory:
      topName && topTotal && topTotal > 0
        ? { name: topName, total: topTotal, share: expenses > 0 ? topTotal / expenses : 0 }
        : null,
    invoices: {
      total: invoicesTotal,
      share: expenses > 0 ? invoicesTotal / expenses : null,
      count: invoices.length,
    },
    byResponsible,
  }
}

export type WeekDue = {
  from: string
  to: string
  /** Pendentes com vencimento de hoje até domingo. */
  upcoming: Transaction[]
  upcomingTotal: number
  paid: Transaction[]
  paidTotal: number
  /** Pendentes vencidas antes de hoje (qualquer mês). */
  overdue: Transaction[]
  overdueTotal: number
}

/** Vencimentos da semana (segunda a domingo) a partir das despesas com vencimento. */
export function buildWeekDue({
  weekTransactions,
  overdueTransactions,
  today = todayIso(),
}: {
  weekTransactions: Transaction[]
  overdueTransactions: Transaction[]
  today?: string
}): WeekDue {
  const { from, to } = weekBounds(today)
  const byDueDate = (a: Transaction, b: Transaction) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
  const expenses = weekTransactions.filter((t) => t.type === "EXPENSE" && t.dueDate)
  const upcoming = expenses
    .filter((t) => t.paymentStatus !== "PAID" && (t.dueDate ?? "") >= today)
    .sort(byDueDate)
  const paid = expenses.filter((t) => t.paymentStatus === "PAID").sort(byDueDate)
  const overdue = overdueTransactions
    .filter((t) => t.type === "EXPENSE" && t.paymentStatus !== "PAID")
    .sort((a, b) => byDueDate(b, a))
  const sum = (items: Transaction[]) =>
    items.reduce((total, item) => total + Number(item.amount || 0), 0)

  return {
    from,
    to,
    upcoming,
    upcomingTotal: sum(upcoming),
    paid,
    paidTotal: sum(paid),
    overdue,
    overdueTotal: sum(overdue),
  }
}

export function formatPercent(value: number | null | undefined, fractionDigits = 0) {
  if (value == null || !Number.isFinite(value)) {
    return "--"
  }
  return `${(value * 100).toFixed(fractionDigits)}%`
}
