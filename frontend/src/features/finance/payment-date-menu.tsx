import { Menu } from "@base-ui/react/menu"
import { Check, CheckCircle2 } from "lucide-react"
import type { ReactNode } from "react"

import { recentPaymentDays } from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

/**
 * Botão de "marcar como pago" que abre a lista dos últimos 7 dias. "Hoje" vem primeiro e recebe o
 * foco ao abrir, então Enter (ou um clique) mantém o atalho de antes.
 */
export function PaymentDateMenu({
  onSelect,
  className,
  disabled,
  title = "Marcar como pago",
  "aria-label": ariaLabel,
  children,
  ...rest
}: {
  onSelect: (paymentDate: string) => void
  className?: string
  disabled?: boolean
  title?: string
  "aria-label": string
  children: ReactNode
} & { "data-carousel-no-drag"?: boolean }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={className}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        {...rest}
      >
        {children}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="z-[130] outline-none"
          sideOffset={6}
          align="end"
        >
          <Menu.Popup className="app-field-popup w-52">
            <Menu.Group>
              <Menu.GroupLabel className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Pago em
              </Menu.GroupLabel>
              {recentPaymentDays().map((day, index) => (
                <Menu.Item
                  key={day.date}
                  className="app-field-item min-h-9"
                  onClick={() => onSelect(day.date)}
                >
                  <span className={cn(index === 0 && "font-semibold")}>
                    {day.label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {day.short}
                  </span>
                </Menu.Item>
              ))}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/**
 * Versão para as folhas de ações (mobile): os dias em pílulas roláveis, "Hoje" primeiro e destacado.
 * Tocar num dia já registra o pagamento.
 */
export function PaymentDayChips({
  label = "Marcar como pago",
  onSelect,
}: {
  label?: string
  onSelect: (paymentDate: string) => void
}) {
  return (
    <div className="border-b border-border/70 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2
          size={16}
          className="text-emerald-600 dark:text-emerald-400"
        />
        {label}
      </p>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {recentPaymentDays().map((day, index) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 text-xs transition active:scale-95",
              index === 0
                ? "border-emerald-500/50 bg-emerald-500/12 font-semibold text-emerald-700 dark:text-emerald-300"
                : "border-border bg-card text-foreground hover:border-emerald-500/40"
            )}
          >
            <span className="flex items-center gap-1">
              {index === 0 ? <Check size={12} /> : null}
              {day.label}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {day.short}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
