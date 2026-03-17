import { useDashboard } from "@/features/finance/hooks.ts"
import { PlanManager } from "@/features/finance/managers.tsx"

export function PlansPage() {
  const { plans, activePlan, selectedPlanId, setSelectedPlanId, userId } = useDashboard()

  return (
    <PlanManager
      plans={plans}
      activePlan={activePlan}
      selectedPlanId={selectedPlanId}
      onSelectPlanId={setSelectedPlanId}
      userId={userId}
    />
  )
}
