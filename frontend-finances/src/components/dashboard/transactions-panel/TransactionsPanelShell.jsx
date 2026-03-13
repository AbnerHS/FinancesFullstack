import { InvoiceLinkModal } from "./InvoiceLinkModal";
import { TransactionComposer } from "./TransactionComposer";
import { TransactionsSummary } from "./TransactionsSummary";
import { TransactionsTable } from "./TransactionsTable";
import { useTransactionsPanelState } from "./useTransactionsPanel";

const formatPeriodLabel = (period) => {
  if (!period) {
    return "";
  }

  const monthName = new Date(period.year, period.month - 1, 1).toLocaleString(
    "pt-BR",
    { month: "long" }
  );

  return `${monthName}/${period.year}`;
};

export const TransactionsPanelShell = () => {
  const { panel } = useTransactionsPanelState();

  return (
    <main className="lg:col-span-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-row items-center justify-between gap-4">
          {panel.period && (
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
              {formatPeriodLabel(panel.period)}
            </span>
          )}

          <TransactionsSummary />
        </div>

        <TransactionComposer />

        <div className="p-0">
          <TransactionsTable groupByResponsible />
        </div>
      </div>

      <InvoiceLinkModal />
    </main>
  );
};
