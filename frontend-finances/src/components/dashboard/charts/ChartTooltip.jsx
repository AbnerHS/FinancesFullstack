import { formatCurrency } from "../../../utils/dashboard";
import { chartTheme } from "./chartTheme";

const baseStyle = {
  background: chartTheme.tooltipSurface,
  border: `1px solid ${chartTheme.border}`,
  borderRadius: "18px",
  boxShadow: "0 18px 36px rgba(13, 50, 65, 0.12)",
  padding: "0.9rem 1rem",
};

const labelStyle = {
  color: chartTheme.text,
  fontWeight: 600,
  marginBottom: "0.35rem",
};

export const CurrencyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div style={baseStyle}>
      <p style={labelStyle}>{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium" style={{ color: entry.color }}>
              {entry.name}
            </span>
            <span className="text-[var(--color-ink-strong)]">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
