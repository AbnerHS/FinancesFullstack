import { createPortal } from "react-dom"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"

export type ConfirmationDialogState = {
  confirmLabel: string
  description: string
  title: string
  onConfirm: () => void
  secondaryConfirmLabel?: string
  onSecondaryConfirm?: () => void
}

export function ConfirmationDialog({
  onClose,
  state,
}: {
  onClose: () => void
  state: ConfirmationDialogState | null
}) {
  if (!state) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
        <div className="border-b border-border/70 px-4 py-4 sm:px-5">
          <p className="app-eyebrow">Excluir</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">
            {state.title}
          </h3>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <p className="text-sm text-muted-foreground">{state.description}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-4 py-4 sm:px-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {state.secondaryConfirmLabel && state.onSecondaryConfirm ? (
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
              onClick={() => {
                state.onSecondaryConfirm?.()
                onClose()
              }}
            >
              <Trash2 size={16} />
              {state.secondaryConfirmLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => {
              state.onConfirm()
              onClose()
            }}
          >
            <Trash2 size={16} />
            {state.confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
