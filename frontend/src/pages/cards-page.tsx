import { CardsOverview } from "@/features/finance/cards-overview.tsx"
import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { usePlanContext } from "@/features/finance/hooks.ts"

export function CardsPage() {
  const { activePlan, creditCards, userId, responsibleOptions, periods, defaultMonthId } =
    usePlanContext()
  // Nova fatura começa no mês aberto no dashboard (ou no mês atual).
  const selectedMonthId = useDashboardStore((state) => state.selectedMonthId)

  return (
    <CardsOverview
      planId={activePlan?.id ?? null}
      creditCards={creditCards}
      userId={userId}
      responsibleOptions={responsibleOptions}
      periods={periods}
      preferredMonthId={selectedMonthId ?? defaultMonthId}
    />
  )
}
