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
