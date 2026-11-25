import { Input } from "@/components/ui/input.tsx"
import { formatCurrencyInput } from "@/features/finance/utils.ts"

type CurrencyInputProps = {
  value: string
  onValueChange: (value: string) => void
  className?: string
  /** Classe do "R$" (ex.: cor do tipo da transação). */
  prefixClassName?: string
  placeholder?: string
}

export function CurrencyInput({
  value,
  onValueChange,
  className,
  prefixClassName,
  placeholder = "0,00",
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${prefixClassName ?? "text-muted-foreground"}`}
      >
        R$
      </span>
      <Input
        type="text"
        inputMode="numeric"
        value={value || ""}
        onChange={(event) => onValueChange(formatCurrencyInput(event.target.value))}
        placeholder={placeholder}
        className={`pl-11 ${className ?? ""}`}
      />
    </div>
  )
}
