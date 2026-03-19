import { useDashboard } from "@/features/finance/hooks.ts"
import { PeriodsManager } from "@/features/finance/managers.tsx"

export function PeriodsPage() {
  const {
    activePlan,
    periods,
    selectedPeriodIds,
    selectedStartPeriodId,
    selectedEndPeriodId,
    setSelectedStartPeriodId,
    setSelectedEndPeriodId,
  } = useDashboard()

  return (
    <PeriodsManager
      activePlan={activePlan}
      periods={periods}
      selectedPeriodIds={selectedPeriodIds}
      selectedStartPeriodId={selectedStartPeriodId}
      selectedEndPeriodId={selectedEndPeriodId}
      onSelectStartPeriodId={setSelectedStartPeriodId}
      onSelectEndPeriodId={setSelectedEndPeriodId}
    />
  )
}
