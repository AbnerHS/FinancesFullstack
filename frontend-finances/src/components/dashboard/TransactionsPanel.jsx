import { TransactionsTable } from "./TransactionsTable";
import { useTransactionsPanel } from "../../hooks/useTransactionsPanel";
import { ArrowDownCircle, ArrowUpCircle, Info, Plus, Tag, Wallet } from "lucide-react";

const formatPeriodLabel = (period) => {
  if (!period) return "";
  const monthName = new Date(period.year, period.month - 1, 1).toLocaleString(
    "pt-BR",
    { month: "long" }
  );
  return `${monthName}/${period.year}`;
};

export const TransactionsPanel = ({
  selectedPeriod,
  activePeriodId,
  userId,
  entries,
  creditCards,
  periods,
  responsibleOptions,
  transactionsLoading,
  invoicesLoading,
}) => {
  const {
    editingId,
    editingForm,
    setEditingForm,
    editingInvoiceId,
    editingInvoiceForm,
    setEditingInvoiceForm,
    newTransaction,
    setNewTransaction,
    createTransaction,
    updateTransaction,
    updateInvoice,
    reorderTransactions,
    linkTransactionToInvoice,
    deleteTransaction,
    canCreate,
    summary,
    startEditEntry,
    openPaymentModal,
    closePaymentModal,
    paymentModalEntry,
    selectedInvoiceId,
    setSelectedInvoiceId,
    editingScope,
    setEditingScope,
    resolvedResponsibleUserId,
    setEditingId,
    setEditingInvoiceId,
  } = useTransactionsPanel({
    activePeriodId,
    userId,
    entries,
    periods,
    responsibleOptions,
  });

  const availableInvoices = entries.filter((entry) => entry.kind === "INVOICE");

  const creditCardById = creditCards.reduce((acc, card) => {
    acc[card.id] = card;
    return acc;
  }, {});

  return (
    <main className="lg:col-span-10"> 
      <div className="flex flex-col gap-6">
        {/* 1. Header & Summary Section */}
        <div className="flex flex-row items-center justify-between gap-4">
          {selectedPeriod && (
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-bold uppercase tracking-wider">
              {formatPeriodLabel(selectedPeriod)}
            </span>
          )}
          {/* KPIs Compactos e Elegantes */}
          <div className="flex items-center gap-6 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <SummaryItem label="Entradas" value={summary.incomes} color="text-emerald-600" icon={<ArrowUpCircle size={16} />} />
            <div className="w-px h-8 bg-gray-100" />
            <SummaryItem label="Saídas" value={summary.expenses} color="text-rose-600" icon={<ArrowDownCircle size={16} />} />
            <div className="w-px h-8 bg-gray-100" />
            <SummaryItem label="Saldo" value={summary.balance} color={summary.balance > 0 ? "text-green-600" : "text-red-600"} icon={<Wallet size={16} />} isBold />
          </div>
        </div>

        {/* 2. Quick Insert Bar (O formulário de lançamento) */}
        <div className={`relative overflow-hidden rounded-xl border transition-all ${canCreate ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-dashed border-gray-300'}`}>
          {!canCreate && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/60 backdrop-blur-[1px]">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <Info size={16} /> Selecione um período para habilitar lançamentos
              </p>
            </div>
          )}

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 relative">
                <input
                  className="w-full rounded-lg border-gray-200 pl-3 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="O que você comprou ou recebeu?"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border-gray-200 pl-9 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="0,00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction(p => ({ ...p, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <select
                  className="w-full rounded-lg border-gray-200 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction(p => ({ ...p, type: e.target.value }))}
                >
                  <option value="REVENUE">📈 Entrada</option>
                  <option value="EXPENSE">📉 Saída</option>
                </select>
              </div>

              <div className="md:col-span-2 relative">
                <Tag className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  className="w-full rounded-lg border-gray-200 pl-9 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Tag"
                  value={newTransaction.responsibilityTag}
                  onChange={(e) => setNewTransaction(p => ({ ...p, responsibilityTag: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <select
                  className="w-full rounded-lg border-gray-200 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={resolvedResponsibleUserId}
                  onChange={(e) =>
                    setNewTransaction((p) => ({
                      ...p,
                      responsibleUserId: e.target.value,
                    }))
                  }
                >
                  <option value="">Responsavel</option>
                  {responsibleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={() => createTransaction.mutate()}
                  disabled={createTransaction.isPending || !canCreate}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm shadow-indigo-200"
                >
                  <Plus size={18} />
                  {createTransaction.isPending ? '...' : 'Lançar'}
                </button>
              </div>

              <div className="md:col-span-12 flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={Boolean(newTransaction.isRecurring)}
                    onChange={(e) =>
                      setNewTransaction((prev) => ({
                        ...prev,
                        isRecurring: e.target.checked,
                        numberOfPeriods:
                          prev.numberOfPeriods && Number(prev.numberOfPeriods) >= 2
                            ? prev.numberOfPeriods
                            : 2,
                      }))
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Recorrente
                </label>
                {newTransaction.isRecurring && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Períodos</span>
                    <input
                      type="number"
                      min="2"
                      value={newTransaction.numberOfPeriods}
                      onChange={(e) =>
                        setNewTransaction((prev) => ({
                          ...prev,
                          numberOfPeriods: e.target.value,
                        }))
                      }
                      className="w-16 rounded-lg border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>
            </div>
            {createTransaction.isError && (
              <p className="mt-2 text-xs text-rose-600 font-medium">⚠️ {createTransaction.error.message}</p>
            )}
          </div>
        </div>

        <div className="p-0">
          <TransactionsTable
            entries={entries}
            transactionsLoading={transactionsLoading}
            invoicesLoading={invoicesLoading}
            editingId={editingId}
            editingForm={editingForm}
            onEditingFormChange={setEditingForm}
            editingScope={editingScope}
            onEditingScopeChange={setEditingScope}
            responsibleOptions={responsibleOptions}
            groupByResponsible
            editingInvoiceId={editingInvoiceId}
            editingInvoiceForm={editingInvoiceForm}
            onEditingInvoiceFormChange={setEditingInvoiceForm}
            onSaveEdit={() => updateTransaction.mutate()}
            onCancelEdit={() => {
              setEditingId(null);
              setEditingScope("SINGLE");
            }}
            onSaveInvoice={() => updateInvoice.mutate()}
            onCancelInvoice={() => setEditingInvoiceId(null)}
            onStartEdit={startEditEntry}
            onOpenPaymentModal={openPaymentModal}
            onDeleteTransaction={(entry) => deleteTransaction.mutate(entry)}
            updateTransactionPending={updateTransaction.isPending}
            updateTransactionError={updateTransaction.error?.message}
            updateInvoicePending={updateInvoice.isPending}
            updateInvoiceError={updateInvoice.error?.message}
            deleteTransactionPending={deleteTransaction.isPending}
            deleteTransactionError={deleteTransaction.error?.message}
            creditCards={creditCards}
            onReorderTransactions={(ordered) => reorderTransactions.mutate(ordered)}
            reorderPending={reorderTransactions.isPending}
          />
        </div>
      </div>

      {paymentModalEntry && (
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
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Selecione a fatura</option>
                {availableInvoices.map((invoice) => {
                  const card = creditCardById[invoice.creditCardId];
                  const invoiceLabel = card?.name
                    ? `${card.name} - R$ ${Number(invoice.amount || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`
                    : `Fatura - R$ ${Number(invoice.amount || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`;

                  return (
                    <option key={invoice.invoiceId} value={invoice.invoiceId}>
                      {invoiceLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {linkTransactionToInvoice.isError && (
              <p className="mt-2 text-xs text-rose-600">
                {linkTransactionToInvoice.error?.message || "Erro ao vincular transacao."}
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
                onClick={closePaymentModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => linkTransactionToInvoice.mutate()}
                disabled={
                  linkTransactionToInvoice.isPending || availableInvoices.length === 0
                }
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {linkTransactionToInvoice.isPending ? "Vinculando..." : "Vincular"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const SummaryItem = ({ label, value, color, icon, isBold }) => (
  <div className="flex items-center gap-3">
    <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>{icon}</div>
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
      <p className={`text-sm ${color} ${isBold ? 'font-bold' : 'font-medium'}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </p>
    </div>
  </div>
);
