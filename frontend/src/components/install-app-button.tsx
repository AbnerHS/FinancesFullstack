import { useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Download, EllipsisVertical, Lock, MonitorDown, Share, SquarePlus, X } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { promptInstall, useInstallState } from "@/lib/pwa.ts"
import { useEscapeKey } from "@/lib/use-escape-key.ts"
import { cn } from "@/lib/utils.ts"

type HelpKind = "ios" | "insecure" | "firefox" | "android" | "desktop"

function helpKindFor(state: ReturnType<typeof useInstallState>): HelpKind {
  if (state === "ios") return "ios"
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure"
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent
  if (/firefox|fxios/i.test(agent)) return "firefox"
  if (/android/i.test(agent)) return "android"
  return "desktop"
}

/**
 * "Instalar app". Sempre visível enquanto o app não está instalado:
 * - Chrome/Edge/Android com a instalação disponível: abre o diálogo do navegador;
 * - nos outros casos: mostra como instalar por aqui (iPhone/iPad, menu do navegador) ou por que não
 *   dá (endereço sem HTTPS, Firefox no computador).
 */
export function InstallAppButton({
  variant = "sidebar",
  onDone,
}: {
  /** "sidebar": botão largo do menu; "compact": botão pequeno (tela de login). */
  variant?: "sidebar" | "compact"
  onDone?: () => void
}) {
  const state = useInstallState()
  const [help, setHelp] = useState<HelpKind | null>(null)
  const closeHelp = () => setHelp(null)
  useEscapeKey(Boolean(help), closeHelp)

  if (state === "installed") return null

  const onClick = async () => {
    if (state === "prompt") {
      if (await promptInstall()) onDone?.()
      return
    }
    setHelp(helpKindFor(state))
  }

  return (
    <>
      {variant === "sidebar" ? (
        <Button
          type="button"
          className="h-12 w-full justify-start gap-2 rounded-[1.25rem] pl-4"
          onClick={onClick}
        >
          <Download size={16} />
          Instalar app
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onClick}>
          <Download size={15} />
          Instalar app
        </Button>
      )}

      {help ? createPortal(<InstallHelp kind={help} onClose={closeHelp} />, document.body) : null}
    </>
  )
}

function Step({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="rounded-lg bg-primary/12 p-1.5 text-primary">{icon}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

function InstallHelp({ kind, onClose }: { kind: HelpKind; onClose: () => void }) {
  const title =
    kind === "insecure"
      ? "Instalação indisponível neste endereço"
      : kind === "firefox"
        ? "Instalação indisponível no Firefox"
        : "Instalar o Finances"

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-t-2xl border border-border bg-card px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-[0_-20px_60px_rgba(2,6,23,0.35)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2">
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

        <ol className={cn("mt-3 space-y-3 text-sm text-foreground")}>
          {kind === "ios" ? (
            <>
              <Step icon={<Share size={16} />}>
                Toque em <strong>Compartilhar</strong> (na barra do navegador).
              </Step>
              <Step icon={<SquarePlus size={16} />}>
                Escolha <strong>Adicionar à Tela de Início</strong> e confirme em{" "}
                <strong>Adicionar</strong>.
              </Step>
            </>
          ) : null}
          {kind === "android" ? (
            <Step icon={<EllipsisVertical size={16} />}>
              Abra o menu <strong>⋮</strong> do navegador e toque em <strong>Instalar app</strong>{" "}
              (ou <strong>Adicionar à tela inicial</strong>).
            </Step>
          ) : null}
          {kind === "desktop" ? (
            <>
              <Step icon={<MonitorDown size={16} />}>
                Clique no ícone de instalar, no fim da barra de endereço.
              </Step>
              <Step icon={<EllipsisVertical size={16} />}>
                Ou abra o menu <strong>⋮</strong>: no Chrome, <strong>Transmitir, salvar e compartilhar</strong>{" "}
                → <strong>Instalar página como app</strong>; no Edge, <strong>Aplicativos</strong> →{" "}
                <strong>Instalar este site como aplicativo</strong>.
              </Step>
            </>
          ) : null}
          {kind === "insecure" ? (
            <Step icon={<Lock size={16} />}>
              O navegador só instala apps abertos por um endereço seguro (<strong>https</strong>). Abra o
              Finances pelo endereço oficial e toque em <strong>Instalar app</strong> de novo.
            </Step>
          ) : null}
          {kind === "firefox" ? (
            <Step icon={<MonitorDown size={16} />}>
              O Firefox no computador não instala apps. Abra o Finances no <strong>Chrome</strong> ou no{" "}
              <strong>Edge</strong> para instalar.
            </Step>
          ) : null}
        </ol>

        {kind === "ios" || kind === "android" || kind === "desktop" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            O app abre em janela própria, sem a barra do navegador, com o ícone do Finances.
          </p>
        ) : null}
      </div>
    </div>
  )
}
