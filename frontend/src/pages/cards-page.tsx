import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { usePlanContext } from "@/features/finance/hooks.ts"
import { CreditCardsManager, InvoiceManager } from "@/features/finance/managers.tsx"

export function CardsPage() {
  const { creditCards, ownCreditCards, userId, periods, defaultMonthId } = usePlanContext()
  // Nova fatura começa no mês aberto no dashboard (ou no mês atual).
  const selectedMonthId = useDashboardStore((state) => state.selectedMonthId)
  const preferredMonthId = selectedMonthId ?? defaultMonthId

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section>
        <CreditCardsManager creditCards={ownCreditCards} userId={userId} />
      </section>
      <section>
        <InvoiceManager
          creditCards={creditCards}
          periods={periods}
          selectedPeriodIds={preferredMonthId ? [preferredMonthId] : []}
        />
      </section>
    </div>
  )
}
