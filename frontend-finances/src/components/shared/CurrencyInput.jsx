import { formatCurrencyInput } from "../../utils/currency";

export const CurrencyInput = ({
  value,
  onValueChange,
  className = "",
  placeholder = "0,00",
  align = "left",
}) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
      R$
    </span>
    <input
      type="text"
      inputMode="numeric"
      value={value || ""}
      onChange={(event) => onValueChange(formatCurrencyInput(event.target.value))}
      placeholder={placeholder}
      className={`${className} pl-9! ${align === "right" ? "text-right" : ""}`}
    />
  </div>
);
