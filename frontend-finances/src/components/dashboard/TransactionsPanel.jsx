import { StatCard } from "./StatCard";
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
    canCreate,
    summary,
    startEditEntry,
    openPaymentModal,
    setEditingId,
    setEditingInvoiceId,
  } = useTransactionsPanel({ activePeriodId, userId, entries });

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
            <SummaryItem label="Saldo" value={summary.balance} color="text-gray-900" icon={<Wallet size={16} />} isBold />
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
                <button
                  onClick={() => createTransaction.mutate()}
                  disabled={createTransaction.isPending || !canCreate}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm shadow-indigo-200"
                >
                  <Plus size={18} />
                  {createTransaction.isPending ? '...' : 'Lançar'}
                </button>
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
            editingInvoiceId={editingInvoiceId}
            editingInvoiceForm={editingInvoiceForm}
            onEditingInvoiceFormChange={setEditingInvoiceForm}
            onSaveEdit={() => updateTransaction.mutate()}
            onCancelEdit={() => setEditingId(null)}
            onSaveInvoice={() => updateInvoice.mutate()}
            onCancelInvoice={() => setEditingInvoiceId(null)}
            onStartEdit={startEditEntry}
            onOpenPaymentModal={openPaymentModal}
            updateTransactionPending={updateTransaction.isPending}
            updateTransactionError={updateTransaction.error?.message}
            updateInvoicePending={updateInvoice.isPending}
            updateInvoiceError={updateInvoice.error?.message}
            creditCards={creditCards}
            onReorderTransactions={(ordered) => reorderTransactions.mutate(ordered)}
            reorderPending={reorderTransactions.isPending}
          />
        </div>
      </div>
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
