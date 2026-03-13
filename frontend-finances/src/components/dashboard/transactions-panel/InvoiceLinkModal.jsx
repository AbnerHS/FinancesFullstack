import {
  useTransactionsPanelCommands,
  useTransactionsPanelLookups,
  useTransactionsPanelState,
} from "./useTransactionsPanel";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

export const InvoiceLinkModal = () => {
  const { paymentModalEntry, selectedInvoiceId } = useTransactionsPanelState();
  const { creditCardById, availableInvoices } = useTransactionsPanelLookups();
  const { transactionLinking } = useTransactionsPanelCommands();

  if (!paymentModalEntry) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          Vincular a fatura
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Transacao:{" "}
          <span className="font-semibold text-gray-800">
            {paymentModalEntry.description}
          </span>
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
            Fatura
          </label>
          <select
            value={selectedInvoiceId}
            onChange={(event) =>
              transactionLinking.setSelectedInvoiceId(event.target.value)
            }
            className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">Selecione a fatura</option>
            {availableInvoices.map((invoice) => {
              const card = creditCardById.get(invoice.creditCardId);
              const invoiceLabel = card?.name
                ? `${card.name} - R$ ${formatCurrency(invoice.amount)}`
                : `Fatura - R$ ${formatCurrency(invoice.amount)}`;

              return (
                <option key={invoice.invoiceId} value={invoice.invoiceId}>
                  {invoiceLabel}
                </option>
              );
            })}
          </select>
        </div>

        {transactionLinking.linkTransactionToInvoice.isError && (
          <p className="mt-2 text-xs text-rose-600">
            {transactionLinking.linkTransactionError}
          </p>
        )}

        {availableInvoices.length === 0 && (
          <p className="mt-2 text-xs text-amber-600">
            Nenhuma fatura disponivel neste periodo.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={transactionLinking.closePaymentModal}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => transactionLinking.linkTransactionToInvoice.mutate()}
            disabled={
              transactionLinking.linkTransactionToInvoice.isPending ||
              availableInvoices.length === 0
            }
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {transactionLinking.linkTransactionToInvoice.isPending
              ? "Vinculando..."
              : "Vincular"}
          </button>
        </div>
      </div>
    </div>
  );
};
