import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "../../../utils/dashboard";
import ChartCard from "./ChartCard";
import { CurrencyTooltip } from "./ChartTooltip";
import { chartTheme } from "./chartTheme";

const EmptyState = () => (
  <div className="flex h-[20rem] items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-soft)] px-6 text-center text-sm text-[var(--color-muted)]">
    Selecione periodos para comparar receitas e despesas.
  </div>
);

const IncomeExpenseComparisonChart = ({ data }) => (
  <ChartCard eyebrow="Comparativo" title="Receitas vs despesas">
    {data.length === 0 ? (
      <EmptyState />
    ) : (
      <div className="h-[20rem] rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={18} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: chartTheme.axis, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={88}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CurrencyTooltip />} />
            <Bar dataKey="incomes" name="Receitas" fill={chartTheme.income} radius={[8, 8, 0, 0]} maxBarSize={32} />
            <Bar dataKey="expenses" name="Despesas" fill={chartTheme.expense} radius={[8, 8, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </ChartCard>
);

export default IncomeExpenseComparisonChart;
