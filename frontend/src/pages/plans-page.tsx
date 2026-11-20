import { usePlanContext } from "@/features/finance/hooks.ts"
import { CategoryManager, PlanManager } from "@/features/finance/managers.tsx"

export function PlansPage() {
  const {
    plans,
    activePlan,
    monthSummaries,
    selectedPlanId,
    setSelectedPlanId,
    userId,
    transactionCategories,
  } = usePlanContext()

  return (
    <div className="grid gap-6">
      <PlanManager
        plans={plans}
        activePlan={activePlan}
        monthSummaries={monthSummaries}
        selectedPlanId={selectedPlanId}
        onSelectPlanId={setSelectedPlanId}
        userId={userId}
      />
      <CategoryManager categories={transactionCategories} />
    </div>
  )
}
