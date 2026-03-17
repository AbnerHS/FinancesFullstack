import { PiggyBank } from "lucide-react"
import type { ReactNode } from "react"

type AuthShellProps = {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="grid min-h-svh bg-[radial-gradient(circle_at_top,rgba(28,90,113,0.12),transparent_22%),linear-gradient(180deg,#edf5f8_0%,#dde8ee_42%,#d3e1e8_100%)] lg:grid-cols-[1.1fr_minmax(26rem,34rem)]">
      <section className="hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <PiggyBank className="h-7 w-7" />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Financial Workspace
            </p>
            <h1 className="max-w-lg font-serif text-5xl font-semibold leading-tight text-slate-900">
              Reorganize seu financeiro com contexto, clareza e rotina.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-600">
              O novo frontend vai manter o que o dashboard antigo fazia bem, com uma base mais forte para crescer em TypeScript.
            </p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-300/70 bg-white/70 p-6 shadow-[0_18px_42px_rgba(15,40,51,0.08)] backdrop-blur">
          <p className="text-sm text-slate-600">
            Auth com refresh token, dados em cache com TanStack Query e interface pronta para evoluir em camadas.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Finances
            </p>
            <h2 className="font-serif text-4xl font-semibold text-slate-900">{title}</h2>
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          </div>
          {children}
          <div className="text-sm text-slate-600">{footer}</div>
        </div>
      </section>
    </div>
  )
}
