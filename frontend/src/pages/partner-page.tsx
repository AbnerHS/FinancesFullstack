import { Users } from "lucide-react"

import { useDashboard } from "@/features/finance/hooks.ts"
import { PlanPartnerManager } from "@/features/finance/managers.tsx"

export function PartnerPage() {
  const { activePlan, responsibleOptions } = useDashboard()

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section>
        <PlanPartnerManager activePlan={activePlan} />
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-eyebrow">Participantes</p>
            <h2 className="font-serif text-3xl font-semibold text-slate-900">
              Responsáveis do plano
            </h2>
          </div>
          <div className="rounded-full bg-accent p-3 text-primary">
            <Users size={18} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {responsibleOptions.length === 0 ? (
            <p className="text-sm text-slate-500">
              O plano ativo ainda não possui participantes adicionais.
            </p>
          ) : (
            responsibleOptions.map((option) => (
              <div
                key={option.id}
                className="rounded-[1.25rem] border border-border bg-secondary/60 px-4 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
