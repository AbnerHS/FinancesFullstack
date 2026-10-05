import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CreditCard,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { getCategoryColor } from "@/features/finance/category-colors.ts"
import { useMonthSummaryData } from "@/features/finance/hooks.ts"
import type {
  Invoice,
  Period,
  Transaction,
} from "@/features/finance/types.ts"
import {
  buildMonthInsights,
  buildWeekDue,
  calculateStats,
  formatCurrency,
  formatDateOnly,
  formatMonthYear,
  formatPercent,
  getTransactionDueAlert,
  type MonthInsights,
  type WeekDue,
} from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

type SummaryPanel = {
  period: Period
  label: string
  transactions: Transaction[]
  invoices: Invoice[]
  stats: { incomes: number; expenses: number; balance: number }
  transactionsLoading?: boolean
  invoicesLoading?: boolean
}

/**
 * Resumo do mês visível no carrossel: KPIs, contas a pagar e para onde foi o dinheiro. A evolução
 * entre meses fica na tela própria (/evolucao).
 */
export function MonthSummary({
  panel,
  responsibleFilter,
  onGoToCurrentMonth,
}: {
  panel: SummaryPanel | null
  responsibleFilter: string
  onGoToCurrentMonth: () => void
}) {
  const data = useMonthSummaryData({ activePeriod: panel?.period ?? null })

  if (!panel) {
    return null
  }

  if (panel.transactionsLoading || panel.invoicesLoading) {
    return <MonthSummarySkeleton label={panel.label} />
  }

  const byResponsible = (transaction: Transaction) =>
    !responsibleFilter || transaction.responsibleUserId === responsibleFilter

  // Mesma regra do painel: com filtro de responsável, as faturas (sem dono) ficam de fora.
  const previousStats = data.previousTransactions
    ? calculateStats(
        data.previousTransactions.filter(byResponsible),
        responsibleFilter
          ? 0
          : (data.previousInvoices ?? []).reduce(
              (total, invoice) => total + Number(invoice.amount || 0),
              0
            )
      )
    : null

  const insights = buildMonthInsights({
    period: panel.period,
    stats: panel.stats,
    transactions: panel.transactions,
    invoices: responsibleFilter ? [] : panel.invoices,
    previousStats,
  })

  const week = data.isCurrentMonth
    ? buildWeekDue({
        weekTransactions: data.weekTransactions.filter(byResponsible),
        overdueTransactions: data.overdueTransactions.filter(byResponsible),
      })
    : null

  // Curto ("ago/26") para caber numa linha nos KPIs do mobile.
  const previousLabel = data.previousPeriod
    ? `${formatMonthYear(data.previousPeriod).slice(0, 3)}/${String(data.previousPeriod.year).slice(2)}`
    : null

  return (
    <section className="app-panel space-y-4 p-4 sm:space-y-5 sm:p-5" aria-label="Resumo do mês">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="app-eyebrow">Resumo do mês</p>
          <h3 className="font-serif text-2xl font-semibold text-foreground capitalize sm:text-3xl">
            {panel.label}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {data.isCurrentMonth ? (
            <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
              Mês atual
            </span>
          ) : (
            <button
              type="button"
              onClick={onGoToCurrentMonth}
              className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
            >
              Voltar ao mês atual
            </button>
          )}
          <Link
            to="/evolucao"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            Evolução
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiTile
          label="Receitas"
          value={formatCurrency(insights.incomes)}
          tone="positive"
          icon={<TrendingUp size={16} />}
          change={insights.incomesChange}
          changeIsGood={(change) => change >= 0}
          changeLabel={previousLabel}
        />
        <KpiTile
          label="Despesas"
          value={formatCurrency(insights.expenses)}
          tone="negative"
          icon={<TrendingDown size={16} />}
          change={insights.expensesChange}
          changeIsGood={(change) => change <= 0}
          changeLabel={previousLabel}
        />
        <KpiTile
          label="Saldo"
          value={formatCurrency(insights.balance)}
          tone={insights.balance < 0 ? "negative" : "positive"}
          icon={<Wallet size={16} />}
          hint={
            insights.savingsRate === null
              ? "Sem receitas no mês"
              : `${formatPercent(insights.savingsRate)} das receitas`
          }
        />
        <KpiTile
          label={
            insights.daily.kind === "available" ? "Disponível/dia" : "Média/dia"
          }
          value={formatCurrency(insights.daily.value)}
          tone="neutral"
          icon={<CalendarDays size={16} />}
          hint={
            insights.daily.kind === "available"
              ? `${insights.daily.days} ${insights.daily.days === 1 ? "dia restante" : "dias restantes"}`
              : `${insights.daily.days} dias no mês`
          }
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <BillsCard
          insights={insights}
          period={panel.period}
          transactions={panel.transactions}
          week={week}
          weekLoading={data.weekLoading}
        />
        <SpendingCard insights={insights} />
      </div>
    </section>
  )
}

/** Mesmo formato do resumo, sem números: aparece na hora ao trocar para um mês ainda sem dados. */
function MonthSummarySkeleton({ label }: { label: string }) {
  return (
    <section
      className="app-panel space-y-4 p-4 sm:space-y-5 sm:p-5"
      aria-label="Resumo do mês"
      aria-busy="true"
    >
      <div>
        <p className="app-eyebrow">Resumo do mês</p>
        <h3 className="font-serif text-2xl font-semibold text-foreground capitalize sm:text-3xl">
          {label}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div
            key={tile}
            className="space-y-2 rounded-2xl border border-border bg-secondary/45 px-3 py-3 sm:rounded-[1.25rem] sm:p-4"
          >
            <div className="h-2.5 w-16 animate-pulse rounded bg-secondary" />
            <div className="h-5 w-28 animate-pulse rounded bg-secondary sm:h-7" />
            <div className="h-2.5 w-20 animate-pulse rounded bg-secondary/70" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="space-y-3 rounded-2xl border border-border p-3.5 sm:rounded-[1.25rem] sm:p-4"
          >
            <div className="h-2.5 w-28 animate-pulse rounded bg-secondary" />
            <div className="h-2 w-full animate-pulse rounded-full bg-secondary" />
            <div className="h-14 w-full animate-pulse rounded-xl bg-secondary/70" />
          </div>
        ))}
      </div>
    </section>
  )
}

function KpiTile({
  label,
  value,
  tone,
  icon,
  hint,
  change,
  changeIsGood,
  changeLabel,
}: {
  label: string
  value: string
  tone: "positive" | "negative" | "neutral"
  icon: ReactNode
  hint?: string
  change?: number | null
  changeIsGood?: (change: number) => boolean
  changeLabel?: string | null
}) {
  const toneClasses = {
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-rose-600 dark:text-rose-400",
    neutral: "text-foreground",
  }[tone]
  const iconClasses = {
    positive: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    negative: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    neutral: "bg-primary/12 text-primary",
  }[tone]

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-secondary/45 px-3 py-2.5 sm:rounded-[1.25rem] sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase sm:text-[11px] sm:tracking-[0.16em]">
          {label}
        </p>
        {/* No mobile o ícone só ocupava espaço e quebrava o rótulo. */}
        <span className={cn("hidden rounded-full p-1.5 sm:inline-flex", iconClasses)}>
          {icon}
        </span>
      </div>
      <p className={cn("mt-0.5 truncate text-base font-semibold tabular-nums sm:mt-1 sm:text-2xl", toneClasses)}>
        {value}
      </p>
      {change !== undefined ? (
        <ChangeBadge change={change ?? null} isGood={changeIsGood} label={changeLabel} />
      ) : (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">{hint}</p>
      )}
    </div>
  )
}

function ChangeBadge({
  change,
  isGood,
  label,
}: {
  change: number | null
  isGood?: (change: number) => boolean
  label?: string | null
}) {
  if (change === null) {
    return (
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
        {label ? `Sem base em ${label}` : "Sem mês anterior"}
      </p>
    )
  }

  const good = isGood ? isGood(change) : change >= 0
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <p
      className={cn(
        "mt-0.5 flex items-center gap-1 text-[11px] font-medium whitespace-nowrap sm:mt-1 sm:text-xs",
        good
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      <Icon size={13} className="shrink-0" aria-hidden="true" />
      {`${Math.abs(change).toFixed(1)}%`}
      <span className="truncate font-normal text-muted-foreground">vs. {label}</span>
    </p>
  )
}

function SummaryCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3.5 sm:rounded-[1.25rem] sm:p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[11px] font-semibold tracking-[0.16em] uppercase">
          {title}
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function ProgressBar({
  value,
  className,
  label,
}: {
  value: number
  className?: string
  label: string
}) {
  const percent = Math.min(Math.max(value, 0), 1) * 100
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all", className)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

type DueItem = { transaction: Transaction; overdue: boolean }

/**
 * Contas a pagar do mês. No mês atual separa atrasadas (de qualquer mês), as que vencem até
 * domingo e o resto do mês; nos outros meses, pendentes e atrasadas daquele mês.
 */
function BillsCard({
  insights,
  period,
  transactions,
  week,
  weekLoading,
}: {
  insights: MonthInsights
  period: Period
  transactions: Transaction[]
  week: WeekDue | null
  weekLoading: boolean
}) {
  const { bills } = insights
  const total = bills.paidCount + bills.pendingCount
  const byDueDate = (a: Transaction, b: Transaction) =>
    (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
  const monthPending = transactions
    .filter(
      (t) =>
        t.type === "EXPENSE" &&
        !t.isClearedByInvoice &&
        t.dueDate &&
        t.paymentStatus !== "PAID"
    )
    .sort(byDueDate)
  const sum = (items: Transaction[]) =>
    items.reduce((acc, item) => acc + Number(item.amount || 0), 0)

  let stats: Array<{ label: string; value: number; count: number; tone: "negative" | "neutral" | "positive" }>
  let items: DueItem[]
  let overdueFromOtherMonths = false

  if (week) {
    const later = monthPending.filter((t) => (t.dueDate ?? "") > week.to)
    overdueFromOtherMonths = week.overdue.some(
      (t) => !(t.referenceDate ?? "").startsWith(period.id)
    )
    stats = [
      {
        label: "Atrasadas",
        value: week.overdueTotal,
        count: week.overdue.length,
        tone: week.overdue.length > 0 ? "negative" : "neutral",
      },
      { label: "Até domingo", value: week.upcomingTotal, count: week.upcoming.length, tone: "neutral" },
      { label: "Restante", value: sum(later), count: later.length, tone: "neutral" },
    ]
    items = [
      ...week.overdue.map((transaction) => ({ transaction, overdue: true })),
      ...week.upcoming.map((transaction) => ({ transaction, overdue: false })),
      ...later.map((transaction) => ({ transaction, overdue: false })),
    ]
  } else {
    const overdue = monthPending.filter((t) => getTransactionDueAlert(t) === "overdue")
    const pending = monthPending.filter((t) => getTransactionDueAlert(t) !== "overdue")
    stats = [
      { label: "Pagas", value: bills.paidTotal, count: bills.paidCount, tone: "positive" },
      { label: "Pendentes", value: sum(pending), count: pending.length, tone: "neutral" },
      {
        label: "Atrasadas",
        value: sum(overdue),
        count: overdue.length,
        tone: overdue.length > 0 ? "negative" : "neutral",
      },
    ]
    items = [
      ...overdue.map((transaction) => ({ transaction, overdue: true })),
      ...pending.map((transaction) => ({ transaction, overdue: false })),
    ]
  }

  const visibleItems = items.slice(0, 5)

  return (
    <SummaryCard title="Contas a pagar" icon={<CalendarClock size={14} />}>
      {total === 0 && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma despesa com vencimento neste mês.
        </p>
      ) : (
        <div className="space-y-3">
          {total > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <p className="text-foreground">
                  <span className="font-semibold">{bills.paidCount}</span> de {total}{" "}
                  pagas no mês
                </p>
                <p className="font-semibold text-foreground">
                  {formatPercent(bills.paidRatio)}
                </p>
              </div>
              <ProgressBar
                value={bills.paidRatio ?? 0}
                className="bg-emerald-500"
                label="Contas pagas no mês"
              />
            </div>
          ) : null}

          <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-secondary/40">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 px-2 py-1.5 sm:px-3">
                <dt className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                <dd
                  className={cn(
                    "text-[13px] font-semibold whitespace-nowrap tabular-nums sm:text-sm",
                    stat.tone === "negative" && "text-rose-600 dark:text-rose-400",
                    stat.tone === "positive" && "text-emerald-600 dark:text-emerald-400",
                    stat.tone === "neutral" && "text-foreground"
                  )}
                >
                  {formatCurrency(stat.value)}
                </dd>
                <dd className="text-[11px] text-muted-foreground">
                  {stat.count} {stat.count === 1 ? "conta" : "contas"}
                </dd>
              </div>
            ))}
          </dl>

          {week && weekLoading ? (
            <p className="text-sm text-muted-foreground">Carregando vencimentos...</p>
          ) : visibleItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendente.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {visibleItems.map(({ transaction, overdue }) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <p
                      className={cn(
                        "flex items-center gap-1 text-[11px]",
                        overdue
                          ? "font-semibold text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {overdue ? <AlertTriangle size={11} aria-hidden="true" /> : null}
                      {overdue ? "Venceu" : "Vence"} {formatDateOnly(transaction.dueDate).slice(0, 5)}
                      {overdue && !(transaction.referenceDate ?? "").startsWith(period.id)
                        ? ` · ${formatDateOnly(transaction.referenceDate).slice(3)}`
                        : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                    {formatCurrency(transaction.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {items.length > visibleItems.length || overdueFromOtherMonths ? (
            <p className="text-[11px] text-muted-foreground">
              {items.length > visibleItems.length
                ? `+${items.length - visibleItems.length} no painel de transações. `
                : ""}
              {overdueFromOtherMonths ? "Atrasadas inclui contas de meses anteriores." : ""}
            </p>
          ) : null}
        </div>
      )}
    </SummaryCard>
  )
}

function SpendingCard({ insights }: { insights: MonthInsights }) {
  const { topCategory, invoices } = insights

  return (
    <SummaryCard title="Para onde foi" icon={<PiggyBank size={14} />}>
      <div className="space-y-3">
        {topCategory ? (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getCategoryColor(topCategory.name) }}
                  aria-hidden="true"
                />
                <span className="truncate font-semibold">{topCategory.name}</span>
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(topCategory.total)}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maior categoria · {formatPercent(topCategory.share)} das despesas
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem despesas no mês.</p>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <CreditCard size={14} aria-hidden="true" />
              Faturas de cartão
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(invoices.total)}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {invoices.count === 0
              ? "Nenhuma fatura no mês"
              : `${invoices.count} ${invoices.count === 1 ? "fatura" : "faturas"} · ${formatPercent(invoices.share)} das despesas`}
          </p>
        </div>
      </div>
    </SummaryCard>
  )
}
