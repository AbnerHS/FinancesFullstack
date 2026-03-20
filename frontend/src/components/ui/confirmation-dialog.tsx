import { createPortal } from "react-dom"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"

export type ConfirmationDialogState = {
  confirmLabel: string
  description: string
  title: string
  onConfirm: () => void
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
        <p className="app-eyebrow">Confirmar exclusão</p>
        <h3 className="mt-2 text-xl font-semibold text-foreground">
          {state.title}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {state.description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
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
