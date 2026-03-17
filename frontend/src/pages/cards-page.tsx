import { useDashboard } from "@/features/finance/hooks.ts"
import { CreditCardsManager, InvoiceManager } from "@/features/finance/managers.tsx"

export function CardsPage() {
  const { creditCards, userId, periods, selectedPeriodIds } = useDashboard()

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section>
        <CreditCardsManager creditCards={creditCards} userId={userId} />
      </section>
      <section>
        <InvoiceManager
          creditCards={creditCards}
          periods={periods}
          selectedPeriodIds={selectedPeriodIds}
        />
      </section>
    </div>
  )
}
