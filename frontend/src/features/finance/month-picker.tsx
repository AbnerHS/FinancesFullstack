import { useState } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { formatMonthLabel, todayIso } from "@/features/finance/utils.ts"
import { useEscapeKey } from "@/lib/use-escape-key.ts"
import { cn } from "@/lib/utils.ts"

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)

/**
 * Salto direto para qualquer mês: ano com setas e grade de 12 meses. Meses com lançamentos ganham
 * um ponto. Folha que sobe do rodapé no celular, modal no desktop.
 */
export function MonthPickerDialog({
  open,
  value,
  monthsWithData,
  onSelect,
  onClose,
}: {
  open: boolean
  /** Mês aberto (AAAA-MM). */
  value: string
  monthsWithData: string[]
  onSelect: (monthId: string) => void
  onClose: () => void
}) {
  useEscapeKey(open, onClose)

  if (!open) return null
  // Montado só quando aberto: o ano exibido começa sempre no mês aberto.
  return createPortal(
    <MonthPickerBody
      value={value}
      monthsWithData={monthsWithData}
      onSelect={onSelect}
      onClose={onClose}
    />,
    document.body
  )
}

function MonthPickerBody({
  value,
  monthsWithData,
  onSelect,
  onClose,
}: {
  value: string
  monthsWithData: string[]
  onSelect: (monthId: string) => void
  onClose: () => void
}) {
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const currentMonthId = todayIso().slice(0, 7)
  const withData = new Set(monthsWithData)

  const choose = (monthId: string) => {
    onSelect(monthId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher mês"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl border border-border bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-20px_60px_rgba(2,6,23,0.35)] sm:rounded-2xl sm:pb-4"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="app-eyebrow">Ir para o mês</p>
          <Button type="button" variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setYear((current) => current - 1)}
            aria-label="Ano anterior"
          >
            <ChevronLeft size={16} />
          </Button>
          <p className="font-serif text-xl font-semibold text-foreground tabular-nums" aria-live="polite">
            {year}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setYear((current) => current + 1)}
            aria-label="Próximo ano"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {MONTHS.map((month) => {
            const monthId = `${year}-${String(month).padStart(2, "0")}`
            const selected = monthId === value
            const isCurrent = monthId === currentMonthId
            return (
              <button
                key={monthId}
                type="button"
                onClick={() => choose(monthId)}
                aria-current={selected ? "date" : undefined}
                className={cn(
                  "relative flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-medium transition",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary/50 text-primary hover:bg-primary/10"
                      : "border-border text-foreground hover:bg-secondary"
                )}
              >
                {formatMonthLabel(month).slice(0, 3)}
                {withData.has(monthId) ? (
                  <span
                    aria-label="com lançamentos"
                    className={cn(
                      "mt-0.5 size-1.5 rounded-full",
                      selected ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 w-full"
          onClick={() => choose(currentMonthId)}
          disabled={value === currentMonthId}
        >
          Ir para o mês atual
        </Button>
      </div>
    </div>
  )
}
