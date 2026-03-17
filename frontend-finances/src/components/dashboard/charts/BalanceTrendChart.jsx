import {
  Area,
  AreaChart,
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
    Selecione mais de um periodo para acompanhar a evolucao do saldo.
  </div>
);

const BalanceTrendChart = ({ data }) => (
  <ChartCard eyebrow="Fluxo de caixa" title="Evolucao por periodo" meta={`${data.length} pontos`}>
    {data.length <= 1 ? (
      <EmptyState />
    ) : (
      <div className="h-[20rem] rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartTheme.line} stopOpacity={0.26} />
                <stop offset="100%" stopColor={chartTheme.line} stopOpacity={0.03} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke={chartTheme.line}
              fill="url(#balanceTrendFill)"
              strokeWidth={3}
              dot={{ r: 4, fill: chartTheme.line, stroke: chartTheme.surface, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: chartTheme.line }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </ChartCard>
);

export default BalanceTrendChart;
