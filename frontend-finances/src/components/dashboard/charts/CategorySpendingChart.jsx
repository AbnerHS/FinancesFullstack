import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency } from "../../../utils/dashboard";
import ChartCard from "./ChartCard";
import { CurrencyTooltip } from "./ChartTooltip";
import { chartTheme } from "./chartTheme";

const EmptyState = () => (
  <div className="flex h-[20rem] items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-soft)] px-6 text-center text-sm text-[var(--color-muted)]">
    As categorias aparecerao aqui quando houver despesas registradas.
  </div>
);

const CategorySpendingChart = ({ data }) => {
  const chartData = data.slice(0, 6);

  return (
    <ChartCard eyebrow="Categorias" title="Gasto por categoria" meta={`${data.length} categorias`}>
      {chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="h-[20rem] rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }} barSize={18}>
              <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: chartTheme.axis, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fill: chartTheme.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar dataKey="amount" name="Despesas" radius={[0, 8, 8, 0]}>
                {chartData.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={chartTheme.categoryPalette[index % chartTheme.categoryPalette.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
};

export default CategorySpendingChart;
