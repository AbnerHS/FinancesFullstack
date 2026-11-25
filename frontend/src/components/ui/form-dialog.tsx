import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { useEscapeKey } from "@/lib/use-escape-key.ts"

/** Janela de formulário: folha que sobe do rodapé no celular, modal no desktop. */
export function FormDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEscapeKey(open, onClose)
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl border border-border bg-card px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-20px_60px_rgba(2,6,23,0.35)] sm:rounded-2xl sm:px-5 sm:pb-5"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={16} />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
