import { Check, Plus, ShoppingCart, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils.ts"

import type { RemoteChange } from "./hooks.ts"
import type { Toast } from "./use-change-toasts.ts"

const KIND_STYLE: Record<RemoteChange["kind"], { icon: typeof Check; className: string }> = {
  checked: { icon: Check, className: "bg-emerald-500 text-white" },
  unchecked: { icon: ShoppingCart, className: "bg-amber-500 text-white" },
  added: { icon: Plus, className: "bg-primary text-primary-foreground" },
  removed: { icon: Trash2, className: "bg-slate-500 text-white" },
}

export function ChangeToasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((toast) => {
        const { icon: Icon, className } = KIND_STYLE[toast.kind]
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm animate-in items-center gap-3 rounded-2xl border border-border bg-card py-2 pr-2 pl-2.5 shadow-[0_12px_32px_rgba(15,23,42,0.18)] fade-in slide-in-from-bottom-2"
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", className)}>
              <Icon size={15} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{toast.text}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Fechar aviso"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
