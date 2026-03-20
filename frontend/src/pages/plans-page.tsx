import { useDashboard } from "@/features/finance/hooks.ts"
import { PlanManager } from "@/features/finance/managers.tsx"

export function PlansPage() {
  const {
    plans,
    activePlan,
    periods,
    selectedPlanId,
    setSelectedPlanId,
    userId,
  } = useDashboard()

  return (
    <PlanManager
      plans={plans}
      activePlan={activePlan}
      periods={periods}
      selectedPlanId={selectedPlanId}
      onSelectPlanId={setSelectedPlanId}
      userId={userId}
    />
  )
}
