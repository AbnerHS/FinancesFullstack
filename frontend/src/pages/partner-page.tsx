import { Users } from "lucide-react"

import { Select } from "@/components/ui/select.tsx"
import { useDashboard } from "@/features/finance/hooks.ts"
import { PlanParticipantsManager } from "@/features/finance/managers.tsx"

export function PartnerPage() {
  const {
    plans,
    activePlan,
    participants,
    isPlanOwner,
    selectedPlanId,
    setSelectedPlanId,
  } = useDashboard()

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <p className="app-eyebrow">Participantes</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">
              Colaboração do plano
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gere links, acompanhe quem faz parte do plano e mantenha a composição atualizada.
            </p>
          </div>

          <div>
            <label className="app-label">Plano ativo</label>
            <Select
              className="mt-2"
              disabled={plans.length === 0}
              value={selectedPlanId || activePlan?.id || ""}
              onChange={(event) => setSelectedPlanId(event.target.value)}
            >
              {plans.length === 0 ? <option value="">Nenhum plano ainda</option> : null}
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
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
