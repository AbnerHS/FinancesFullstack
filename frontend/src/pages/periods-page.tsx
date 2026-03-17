import { useDashboard } from "@/features/finance/hooks.ts"
import { PeriodsManager } from "@/features/finance/managers.tsx"

export function PeriodsPage() {
  const { activePlan, periods, selectedPeriodIds, togglePeriodId } = useDashboard()

  return (
    <PeriodsManager
      activePlan={activePlan}
      periods={periods}
      selectedPeriodIds={selectedPeriodIds}
      onTogglePeriodId={togglePeriodId}
    />
  )
}
