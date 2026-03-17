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

const pieColors = ["#0d3241", "#1c5a71", "#4f8ea6", "#266c53", "#a45844", "#7a6377"]

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
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="app-panel min-w-0">
          <div className="space-y-2">
            <p className="app-eyebrow">Saldo por periodo</p>
            <h3 className="font-serif text-2xl font-semibold text-slate-900">
              Tendencia do saldo
            </h3>
          </div>
          <div className="mt-6 h-80 min-w-0 min-h-[20rem]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e4ea" />
                <XAxis dataKey="label" stroke="#58707b" />
                <YAxis stroke="#58707b" tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value) => tooltipCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#0d3241"
                  strokeWidth={3}
                  dot={{ fill: "#0d3241", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="app-panel min-w-0">
          <div className="space-y-2">
            <p className="app-eyebrow">Categorias</p>
            <h3 className="font-serif text-2xl font-semibold text-slate-900">
              Distribuicao de despesas
            </h3>
          </div>
          <div className="mt-6 h-80 min-w-0 min-h-[20rem]">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="totalAmount"
                  nameKey="category"
                  innerRadius={68}
                  outerRadius={102}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.category} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => tooltipCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card className="app-panel min-w-0">
        <div className="space-y-2">
          <p className="app-eyebrow">Comparacao</p>
          <h3 className="font-serif text-2xl font-semibold text-slate-900">
            Receitas x despesas
          </h3>
        </div>
        <div className="mt-6 h-80 min-w-0 min-h-[20rem]">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d7e4ea" />
              <XAxis dataKey="label" stroke="#58707b" />
              <YAxis stroke="#58707b" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => tooltipCurrency(value)} />
              <Legend />
              <Bar dataKey="incomes" name="Receitas" fill="#266c53" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" name="Despesas" fill="#a45844" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  )
}
