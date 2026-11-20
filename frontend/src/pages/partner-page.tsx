import { Users } from "lucide-react"

import { usePlanContext } from "@/features/finance/hooks.ts"
import { PlanParticipantsManager } from "@/features/finance/managers.tsx"

export function PartnerPage() {
  const { activePlan, participants, isPlanOwner } = usePlanContext()

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <p className="app-eyebrow">Participantes</p>
        <h2 className="font-serif text-3xl font-semibold text-foreground">
          {activePlan ? `Colaboração em ${activePlan.name}` : "Colaboração do plano"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Gere links, acompanhe quem faz parte do plano e mantenha a composição atualizada.
          O plano ativo se troca no topo da tela.
        </p>
      </section>

      {!activePlan ? (
        <section className="app-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Sem plano</p>
              <h3 className="font-serif text-2xl font-semibold text-foreground">
                Nenhum plano selecionado
              </h3>
            </div>
            <div className="rounded-full bg-accent p-3 text-primary">
              <Users size={18} />
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Selecione um plano para visualizar participantes e gerenciar convites.
          </p>
        </section>
      ) : (
        <PlanParticipantsManager
          activePlan={activePlan}
          participants={participants}
          isPlanOwner={isPlanOwner}
        />
      )}
    </div>
  )
}
