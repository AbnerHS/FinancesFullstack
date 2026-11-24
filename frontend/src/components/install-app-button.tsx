import { useState } from "react"
import { createPortal } from "react-dom"
import { Download, Share, SquarePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { promptInstall, useInstallState } from "@/lib/pwa.ts"
import { useEscapeKey } from "@/lib/use-escape-key.ts"

/**
 * "Instalar app": no Chrome/Edge/Android abre o diálogo de instalação do navegador; no iPhone/iPad
 * mostra o passo a passo do Safari. Some quando o app já está instalado ou o navegador não oferece
 * instalação.
 */
export function InstallAppButton({ onDone }: { onDone?: () => void }) {
  const state = useInstallState()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const closeHelp = () => setShowIosHelp(false)
  useEscapeKey(showIosHelp, closeHelp)

  if (state === "installed" || state === "unavailable") return null

  return (
    <>
      <Button
        type="button"
        className="h-12 w-full justify-start gap-2 rounded-[1.25rem] pl-4"
        onClick={async () => {
          if (state === "ios") {
            setShowIosHelp(true)
            return
          }
          if (await promptInstall()) onDone?.()
        }}
      >
        <Download size={16} />
        Instalar app
      </Button>

      {showIosHelp
        ? createPortal(
            <div
              className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
              onClick={closeHelp}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Instalar no iPhone ou iPad"
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-sm rounded-t-2xl border border-border bg-card px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-[0_-20px_60px_rgba(2,6,23,0.35)] sm:rounded-2xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-foreground">Instalar o Finances</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={closeHelp}
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </Button>
                </div>
                <ol className="mt-3 space-y-3 text-sm text-foreground">
                  <li className="flex items-start gap-3">
                    <span className="rounded-lg bg-primary/12 p-1.5 text-primary">
                      <Share size={16} />
                    </span>
                    <span>
                      No Safari, toque em <strong>Compartilhar</strong> (na barra de baixo ou de
                      cima).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="rounded-lg bg-primary/12 p-1.5 text-primary">
                      <SquarePlus size={16} />
                    </span>
                    <span>
                      Escolha <strong>Adicionar à Tela de Início</strong> e confirme em{" "}
                      <strong>Adicionar</strong>.
                    </span>
                  </li>
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">
                  O app abre em tela cheia, sem a barra do navegador. Em outros navegadores do
                  iPhone, abra este endereço no Safari para instalar.
                </p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
