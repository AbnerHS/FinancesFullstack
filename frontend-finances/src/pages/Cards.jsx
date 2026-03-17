import { CreditCardsManager } from "../components/dashboard/CreditCardsManager";
import { InvoiceManager } from "../components/dashboard/InvoiceManager";
import { useDashboard } from "../hooks/useDashboard";

const Cards = () => {
  const { creditCards, userId, periods, selectedPeriodIds } = useDashboard();

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
  );
};

export default Cards;
