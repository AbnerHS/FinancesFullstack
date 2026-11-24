import { RefreshCw, X } from "lucide-react"
import { useRegisterSW } from "virtual:pwa-register/react"

import { Button } from "@/components/ui/button.tsx"

/** De quanto em quanto tempo o app aberto procura uma versão nova (o app instalado fica aberto). */
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000

/**
 * Registra o service worker e avisa quando há uma versão nova publicada. A versão nova só entra
 * quando o usuário toca em "Atualizar", para não recarregar no meio de um lançamento.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) void registration.update()
      }, UPDATE_CHECK_INTERVAL)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-[140] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_20px_50px_rgba(2,6,23,0.35)] lg:bottom-6"
    >
      <RefreshCw size={18} className="shrink-0 text-primary" />
      <p className="min-w-0 flex-1 text-sm text-foreground">Nova versão do app disponível.</p>
      <Button type="button" size="sm" onClick={() => void updateServiceWorker(true)}>
        Atualizar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setNeedRefresh(false)}
        aria-label="Agora não"
      >
        <X size={16} />
      </Button>
    </div>
  )
}
