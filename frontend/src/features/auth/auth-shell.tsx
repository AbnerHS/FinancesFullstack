import { PiggyBank } from "lucide-react"
import type { ReactNode } from "react"

import { ThemeToggle } from "@/components/theme-toggle.tsx"

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
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_minmax(26rem,34rem)]">
      <section className="hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_36px_rgba(37,99,235,0.32)]">
            <PiggyBank className="h-7 w-7" />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Financial Workspace
            </p>
            <h1 className="max-w-lg font-serif text-5xl font-semibold leading-tight text-foreground">
              Reorganize seu financeiro com contexto, clareza e rotina.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              O frontend agora segue uma linguagem mais proxima de dashboard SaaS, com contraste melhor e tema escuro consistente.
            </p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border bg-card/70 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            Auth com refresh token, dados em cache com TanStack Query e interface pronta para evoluir em camadas.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-muted-foreground">
              Finances
            </p>
            <h2 className="font-serif text-4xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          {children}
          <div className="text-sm text-muted-foreground">{footer}</div>
        </div>
      </section>
    </div>
  )
}
