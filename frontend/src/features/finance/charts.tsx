import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

import { EVOLUTION_COLORS } from "@/features/finance/chart-colors.ts"
import { formatCurrency } from "@/features/finance/utils.ts"

export type EvolutionPoint = {
  id: string
  label: string
  /** Rótulo do eixo ("out/26"). */
  shortLabel: string
  incomes: number
  expenses: number
  /** Saldo acumulado do primeiro mês do intervalo até este. */
  cumulativeBalance: number
}

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
})

function EvolutionTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const point = payload?.[0]?.payload as EvolutionPoint | undefined
  if (!active || !point) {
    return null
  }

  const rows = [
    { label: "Receitas", value: point.incomes, color: EVOLUTION_COLORS.incomes },
    { label: "Despesas", value: point.expenses, color: EVOLUTION_COLORS.expenses },
    { label: "Saldo do mês", value: point.incomes - point.expenses },
    {
      label: "Saldo acumulado",
      value: point.cumulativeBalance,
      color: EVOLUTION_COLORS.cumulativeBalance,
    },
  ]

  return (
    <div className="min-w-48 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground capitalize">{point.label}</p>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: row.color ?? "transparent" }}
                aria-hidden="true"
              />
              {row.label}
            </dt>
            <dd className="font-semibold text-foreground tabular-nums">
              {formatCurrency(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/**
 * Receitas e despesas por mês (barras) com o saldo acumulado (linha), num eixo só: as três
 * medidas são valores em reais.
 */
export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  return (
    <div className="h-72 min-w-0 sm:h-80">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 240 }}>
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} />
          <XAxis
            dataKey="shortLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "currentColor", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "currentColor", fontSize: 11 }}
            tickFormatter={(value: number) => compactCurrency.format(value)}
          />
          <Tooltip content={EvolutionTooltip} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
          <Bar
            dataKey="incomes"
            name="Receitas"
            fill={EVOLUTION_COLORS.incomes}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="expenses"
            name="Despesas"
            fill={EVOLUTION_COLORS.expenses}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Line
            dataKey="cumulativeBalance"
            name="Saldo acumulado"
            type="monotone"
            stroke={EVOLUTION_COLORS.cumulativeBalance}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "var(--card, #fff)" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export type CategorySlice = {
  id: string
  label: string
  total: number
  share: number
  color: string
}

function CategoryTooltip({ active, payload }: TooltipContentProps<ValueType, NameType>) {
  const slice = payload?.[0]?.payload as CategorySlice | undefined
  if (!active || !slice) {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="flex items-center gap-1.5 font-semibold text-foreground">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: slice.color }}
          aria-hidden="true"
        />
        {slice.label}
      </p>
      <p className="mt-0.5 text-muted-foreground tabular-nums">
        {formatCurrency(slice.total)} · {Math.round(slice.share * 100)}%
      </p>
    </div>
  )
}

/** Rosca das despesas por categoria, com o total no centro. */
export function CategoryDonut({ slices, total }: { slices: CategorySlice[]; total: number }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[13rem]">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 208, height: 208 }}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="label"
            innerRadius="64%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            // Contorno da cor do cartão: 2px de espaço entre as fatias.
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Pie>
          {/* Acima do total no centro da rosca. */}
          <Tooltip content={CategoryTooltip} wrapperStyle={{ zIndex: 10 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Total
        </span>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  )
}
