import { useDashboard } from "@/features/finance/hooks.ts"
import { PlanManager } from "@/features/finance/managers.tsx"

export function PlansPage() {
  const {
    plans,
    activePlan,
    monthSummaries,
    selectedPlanId,
    setSelectedPlanId,
    userId,
  } = useDashboard()

  return (
    <PlanManager
      plans={plans}
      activePlan={activePlan}
      monthSummaries={monthSummaries}
      selectedPlanId={selectedPlanId}
      onSelectPlanId={setSelectedPlanId}
      userId={userId}
    />
  )
}
