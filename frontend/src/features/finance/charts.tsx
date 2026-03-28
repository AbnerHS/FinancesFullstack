import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card } from "@/components/ui/card.tsx"
import { getCategoryColor } from "@/features/finance/category-colors.ts"
import { formatCurrency } from "@/features/finance/utils.ts"

type ComparisonItem = {
  label: string
  incomes: number
  expenses: number
  balance: number
}

type CategoryItem = {
  category: string
  totalAmount: number
}

const chartGrid = "rgba(148, 163, 184, 0.18)"
const chartAxis = "#94a3b8"

function tooltipCurrency(
  value: number | string | readonly (number | string)[] | undefined
) {
  const normalized = Array.isArray(value) ? value[0] : value
  return formatCurrency(Number(normalized || 0))
}

export function DashboardCharts({
  comparisonData,
  categoryData,
}: {
  comparisonData: ComparisonItem[]
  categoryData: CategoryItem[]
}) {
  const categoryTotal = categoryData.reduce(
    (total, item) => total + Number(item.totalAmount || 0),
    0
  )
  const categoryBreakdown = categoryData.map((item) => ({
    ...item,
    color: getCategoryColor(item.category),
    percentage:
      categoryTotal > 0
        ? (Number(item.totalAmount || 0) / categoryTotal) * 100
        : 0,
  }))

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="app-panel min-w-0">
          <div className="space-y-2">
            <p className="app-eyebrow">Saldo por período</p>
            <h3 className="font-serif text-2xl font-semibold text-foreground">
              Tendência do saldo
            </h3>
          </div>
          <div className="mt-6 h-80 min-h-[20rem] min-w-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
              <LineChart data={comparisonData} margin={{ top: 8, right: 12, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="label" stroke={chartAxis} />
                <YAxis
                  width={92}
                  tickMargin={10}
                  stroke={chartAxis}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value) => tooltipCurrency(value)}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                    backgroundColor: "rgba(15, 23, 42, 0.94)",
                    color: "#e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ fill: "#60a5fa", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="app-panel min-w-0">
          <div className="space-y-2">
            <p className="app-eyebrow">Categorias</p>
            <h3 className="font-serif text-2xl font-semibold text-foreground">
              Distribuição de despesas
            </h3>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="h-80 min-h-[20rem] min-w-0">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="totalAmount"
                    nameKey="category"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => tooltipCurrency(value)}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      backgroundColor: "rgba(15, 23, 42, 0.94)",
                      color: "#e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryBreakdown.length > 0 ? (
                categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    className="rounded-2xl border border-border/70 bg-card/70 px-4 py-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <p className="text-sm font-medium text-foreground">
                            {item.category}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatCurrency(item.totalAmount)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-6 text-sm text-muted-foreground">
                  Nenhuma despesa no perÃ­odo selecionado.
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      <Card className="app-panel min-w-0">
        <div className="space-y-2">
          <p className="app-eyebrow">Comparação</p>
          <h3 className="font-serif text-2xl font-semibold text-foreground">
            Receitas x Despesas
          </h3>
        </div>
        <div className="mt-6 h-80 min-h-[20rem] min-w-0">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={comparisonData} margin={{ top: 8, right: 12, bottom: 0, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="label" stroke={chartAxis} />
              <YAxis
                width={92}
                tickMargin={10}
                stroke={chartAxis}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                formatter={(value) => tooltipCurrency(value)}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  backgroundColor: "rgba(15, 23, 42, 0.94)",
                  color: "#e2e8f0",
                }}
              />
              <Legend />
              <Bar dataKey="incomes" name="Receitas" fill="#34d399" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" name="Despesas" fill="#fb7185" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  )
}
