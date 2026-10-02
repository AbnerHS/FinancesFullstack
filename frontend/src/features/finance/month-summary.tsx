import type { ReactNode } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
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
  ResponsibleOption,
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
  type MonthInsights,
} from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

type SummaryPanel = {
  period: Period
  label: string
  transactions: Transaction[]
  invoices: Invoice[]
  stats: { incomes: number; expenses: number; balance: number }
}

/**
 * Resumo do mês visível no carrossel. Quando ele é o mês atual, mostra também os vencimentos da
 * semana (segunda a domingo) e as contas atrasadas.
 */
export function MonthSummary({
  panel,
  periods,
  responsibleOptions,
  responsibleFilter,
}: {
  panel: SummaryPanel | null
  periods: Period[]
  responsibleOptions: ResponsibleOption[]
  responsibleFilter: string
}) {
  const data = useMonthSummaryData({ activePeriod: panel?.period ?? null, periods })

  if (!panel) {
    return null
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
    responsibleOptions,
  })

  const week = data.isCurrentMonth
    ? buildWeekDue({
        weekTransactions: data.weekTransactions.filter(byResponsible),
        overdueTransactions: data.overdueTransactions.filter(byResponsible),
      })
    : null

  const previousLabel = data.previousPeriod
    ? formatMonthYear(data.previousPeriod)
    : null

  return (
    <section className="app-panel space-y-5" aria-label="Resumo do mês">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="app-eyebrow">Resumo do mês</p>
          <h3 className="font-serif text-2xl font-semibold text-foreground capitalize sm:text-3xl">
            {panel.label}
          </h3>
        </div>
        {data.isCurrentMonth ? (
          <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            Mês atual
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          label={
            insights.daily.kind === "available"
              ? "Disponível por dia"
              : "Gasto médio por dia"
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

      <div className="grid gap-3 lg:grid-cols-3">
        <BillsCard insights={insights} />
        <SpendingCard insights={insights} />
        {insights.byResponsible.length > 1 && !responsibleFilter ? (
          <ResponsibleCard insights={insights} />
        ) : (
          <CommittedCard insights={insights} />
        )}
      </div>

      {week ? <WeekDueBlock week={week} loading={data.weekLoading} /> : null}
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
    <div className="rounded-[1.25rem] border border-border bg-secondary/45 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        <span className={cn("rounded-full p-1.5", iconClasses)}>{icon}</span>
      </div>
      <p className={cn("mt-1 text-lg font-semibold sm:text-2xl", toneClasses)}>
        {value}
      </p>
      {change !== undefined ? (
        <ChangeBadge change={change ?? null} isGood={changeIsGood} label={changeLabel} />
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
      <p className="mt-1 text-xs text-muted-foreground">
        {label ? `Sem base em ${label}` : "Sem mês anterior"}
      </p>
    )
  }

  const good = isGood ? isGood(change) : change >= 0
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight

  return (
    <p
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-xs font-medium",
        good
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      <Icon size={14} aria-hidden="true" />
      {`${Math.abs(change).toFixed(1)}%`}
      <span className="font-normal text-muted-foreground">vs. {label}</span>
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
    <div className="rounded-[1.25rem] border border-border bg-card/80 p-4">
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

function BillsCard({ insights }: { insights: MonthInsights }) {
  const { bills } = insights
  const total = bills.paidCount + bills.pendingCount

  return (
    <SummaryCard title="Contas do mês" icon={<CheckCircle2 size={14} />}>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma despesa com vencimento neste mês.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{bills.paidCount}</span> de {total}{" "}
              pagas
            </p>
            <p className="text-sm font-semibold text-foreground">
              {formatPercent(bills.paidRatio)}
            </p>
          </div>
          <ProgressBar
            value={bills.paidRatio ?? 0}
            className="bg-emerald-500"
            label="Contas pagas no mês"
          />
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Pago</dt>
              <dd className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(bills.paidTotal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">A pagar</dt>
              <dd className="font-semibold text-foreground">
                {formatCurrency(bills.pendingTotal)}
              </dd>
            </div>
          </dl>
          {bills.overdueCount > 0 ? (
            <p className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              <AlertTriangle size={14} aria-hidden="true" />
              {bills.overdueCount}{" "}
              {bills.overdueCount === 1 ? "atrasada" : "atrasadas"} ·{" "}
              {formatCurrency(bills.overdueTotal)}
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

function ResponsibleCard({ insights }: { insights: MonthInsights }) {
  return (
    <SummaryCard title="Gastos por responsável" icon={<Wallet size={14} />}>
      <ul className="space-y-2.5">
        {insights.byResponsible.map((item) => (
          <li key={item.id}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-foreground">{item.label}</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(item.total)}
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar value={item.share} label={`Parte de ${item.label}`} />
            </div>
          </li>
        ))}
      </ul>
    </SummaryCard>
  )
}

function CommittedCard({ insights }: { insights: MonthInsights }) {
  const rate = insights.committedRate
  return (
    <SummaryCard title="Renda comprometida" icon={<Wallet size={14} />}>
      {rate === null ? (
        <p className="text-sm text-muted-foreground">Sem receitas no mês.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-foreground">
            {formatPercent(rate)}
          </p>
          <ProgressBar
            value={rate}
            className={rate > 1 ? "bg-rose-500" : rate > 0.8 ? "bg-amber-500" : "bg-primary"}
            label="Despesas sobre receitas"
          />
          <p className="text-xs text-muted-foreground">
            {rate > 1
              ? "As despesas passaram das receitas."
              : "Das receitas do mês já vão para despesas."}
          </p>
        </div>
      )}
    </SummaryCard>
  )
}

function WeekDueBlock({
  week,
  loading,
}: {
  week: ReturnType<typeof buildWeekDue>
  loading: boolean
}) {
  const items = [...week.upcoming].slice(0, 6)

  return (
    <div className="rounded-[1.25rem] border border-border bg-secondary/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Esta semana</p>
          <p className="text-xs text-muted-foreground">
            {formatDateOnly(week.from)} – {formatDateOnly(week.to)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <WeekStat label="A pagar" value={formatCurrency(week.upcomingTotal)} count={week.upcoming.length} />
        <WeekStat
          label="Pagas"
          value={formatCurrency(week.paidTotal)}
          count={week.paid.length}
          tone="positive"
        />
        <WeekStat
          label="Atrasadas"
          value={formatCurrency(week.overdueTotal)}
          count={week.overdue.length}
          tone={week.overdue.length > 0 ? "negative" : "neutral"}
        />
      </div>

      <div className="mt-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando vencimentos...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada a pagar de hoje até domingo.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card/80">
            {items.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vence {formatDateOnly(transaction.dueDate)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-rose-600 dark:text-rose-400">
                  {formatCurrency(transaction.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function WeekStat({
  label,
  value,
  count,
  tone = "neutral",
}: {
  label: string
  value: string
  count: number
  tone?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-border bg-card/80 px-2.5 py-2">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold sm:text-base",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {count} {count === 1 ? "conta" : "contas"}
      </p>
    </div>
  )
}
