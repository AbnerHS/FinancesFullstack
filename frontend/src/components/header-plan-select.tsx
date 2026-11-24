import { Wallet } from "lucide-react"
import { useMemo } from "react"

import { Select } from "@/components/ui/select.tsx"
import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { usePlans } from "@/features/finance/hooks.ts"

/** Plano ativo no cabeçalho: um só lugar para trocar de plano, visível em todas as telas. */
export function HeaderPlanSelect() {
  const { data: plans = [] } = usePlans()
  const selectedPlanId = useDashboardStore((state) => state.selectedPlanId)
  const setSelectedPlanId = useDashboardStore((state) => state.setSelectedPlanId)
  // Mesma regra do usePlanContext: sem seleção válida, vale o primeiro plano.
  const activePlanId = useMemo(
    () =>
      plans.find((plan) => plan.id === selectedPlanId)?.id ?? plans[0]?.id ?? "",
    [plans, selectedPlanId]
  )

  if (plans.length === 0) return null

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Wallet size={16} className="hidden shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
      <Select
        aria-label="Plano ativo"
        className="h-9 w-[9.5rem] rounded-full text-sm sm:h-10 sm:w-56"
        value={activePlanId}
        onChange={(event) => setSelectedPlanId(event.target.value)}
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </Select>
    </div>
  )
}
