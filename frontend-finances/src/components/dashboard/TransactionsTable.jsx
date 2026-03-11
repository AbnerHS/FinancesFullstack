import { memo, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Pencil,
  X,
  Save,
  Receipt,
  CreditCard,
  History,
  GripVertical,
} from "lucide-react";

const TransactionsTableHeader = memo(function TransactionsTableHeader() {
  return (
    <thead>
      <tr className="bg-gray-50/50 border-b border-gray-100">
        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
          Detalhes
        </th>
        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">
          Valor
        </th>
        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">
          Status / Ações
        </th>
      </tr>
    </thead>
  );
});

const LineEditingDescription = memo(function LineEditingDescription({
  editingForm,
  onEditingFormChange,
}) {
  return (
    <div className="flex flex-col gap-2 max-w-xs">
      <input
        className="rounded-md border-gray-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
        value={editingForm.description}
        onChange={(e) =>
          onEditingFormChange((prev) => ({
            ...prev,
            description: e.target.value,
          }))
        }
        placeholder="Descrição"
      />
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-md border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
          value={editingForm.type}
          onChange={(e) =>
            onEditingFormChange((prev) => ({
              ...prev,
              type: e.target.value,
            }))
          }
        >
          <option value="REVENUE">Entrada</option>
          <option value="EXPENSE">Saída</option>
        </select>
        <input
          className="flex-1 rounded-md border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
          value={editingForm.responsibilityTag || ""}
          onChange={(e) =>
            onEditingFormChange((prev) => ({
              ...prev,
              responsibilityTag: e.target.value,
            }))
          }
          placeholder="Tag"
        />
      </div>
    </div>
  );
});

const LineEditingInvoice = memo(function LineEditingInvoice({
  editingInvoiceForm,
  onEditingInvoiceFormChange,
  creditCards,
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-indigo-600 uppercase">
        Editando Fatura
      </span>
      <select
        className="rounded-md border-gray-200 bg-white px-2 py-1.5 text-sm shadow-sm"
        value={editingInvoiceForm.creditCardId}
        onChange={(e) =>
          onEditingInvoiceFormChange((prev) => ({
            ...prev,
            creditCardId: e.target.value,
          }))
        }
      >
        <option value="">Selecione o cartão</option>
        {creditCards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.name}
          </option>
        ))}
      </select>
    </div>
  );
});

const LineValuesDescription = memo(function LineValuesDescription({
  entry,
  showDragHandle,
}) {
  return (
    <div className="flex items-center gap-3">
      {showDragHandle && (
        <div className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </div>
      )}
      <div
        className={`mt-1 rounded-lg p-2 ${
          entry.kind === "INVOICE"
            ? "bg-amber-50 text-amber-600"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {entry.kind === "INVOICE" ? (
          <CreditCard size={16} />
        ) : (
          <Receipt size={16} />
        )}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-900">{entry.description}</p>
          {entry.responsibilityTag && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase">
              {entry.responsibilityTag}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const LineEditingAmount = memo(function LineEditingAmount({ value, onChange }) {
  return (
    <div className="flex justify-end">
      <div className="relative">
        <span className="absolute left-2 top-1.5 text-xs text-gray-400">
          R$
        </span>
        <input
          type="number"
          step="0.01"
          className="w-28 rounded-md border-gray-200 bg-white pl-7 pr-2 py-1.5 text-right text-sm font-bold shadow-sm"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
});

const LineValuesAmount = memo(function LineValuesAmount({ entry }) {
  return (
    <div className="flex flex-col items-end">
      <span
        className={`text-md font-bold ${
          entry.type === "REVENUE" ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {entry.type === "REVENUE" ? "+" : "-"} R${" "}
        {parseFloat(entry.amount).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}
      </span>
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter">
        {entry.kind === "INVOICE" ? "Fatura de Cartão" : "Lançamento Avulso"}
      </span>
    </div>
  );
});

const LineActionsEditing = memo(function LineActionsEditing({
  onSave,
  onCancel,
  pending,
  hasError,
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          title="Salvar"
          className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
          onClick={onSave}
          disabled={pending}
        >
          <Save size={16} />
        </button>
        <button
          title="Cancelar"
          className="rounded-md bg-white border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100"
          onClick={onCancel}
        >
          <X size={16} />
        </button>
      </div>
      {hasError && (
        <span className="text-[10px] text-rose-600 font-medium">
          Erro ao salvar
        </span>
      )}
    </div>
  );
});

const LineActionsValues = memo(function LineActionsValues({
  entry,
  onStartEdit,
  onOpenPaymentModal,
}) {
  return (
    <>
      <button
        title="Editar lançamento"
        className="rounded-md border border-transparent p-2 text-gray-400 transition-all hover:border-gray-200 hover:bg-white hover:text-indigo-600 group-hover:text-gray-600"
        onClick={() => onStartEdit(entry)}
      >
        <Pencil size={16} />
      </button>

      {entry.kind === "TRANSACTION" ? (
        <button
          title="Vincular a uma fatura"
          className="rounded-md border border-transparent p-2 text-gray-400 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 group-hover:text-gray-600"
          onClick={() => onOpenPaymentModal(entry)}
        >
          <CheckCircle2 size={16} />
        </button>
      ) : (
        <div className="w-9" /> // Placeholder para manter alinhamento
      )}
    </>
  );
});

const TransactionsTableRow = memo(function TransactionsTableRow({
  entry,
  editingId,
  editingForm,
  onEditingFormChange,
  editingInvoiceId,
  editingInvoiceForm,
  onEditingInvoiceFormChange,
  onSaveEdit,
  onCancelEdit,
  onSaveInvoice,
  onCancelInvoice,
  onStartEdit,
  onOpenPaymentModal,
  updateTransactionPending,
  updateTransactionError,
  updateInvoicePending,
  updateInvoiceError,
  creditCards,
  draggable,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const isEditing = editingId === entry.id && entry.kind !== "INVOICE";
  const isEditingInvoice = editingInvoiceId === entry.invoiceId;
  const isEditingAny = isEditing || isEditingInvoice;

  return (
    <tr
      className={`group transition-colors ${
        isEditingAny ? "bg-indigo-50/30" : "hover:bg-gray-50/80"
      } ${isDragOver ? "bg-indigo-50/60" : ""}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <td className="px-6 py-4">
        {isEditing ? (
          <LineEditingDescription
            editingForm={editingForm}
            onEditingFormChange={onEditingFormChange}
          />
        ) : isEditingInvoice ? (
          <LineEditingInvoice
            editingInvoiceForm={editingInvoiceForm}
            onEditingInvoiceFormChange={onEditingInvoiceFormChange}
            creditCards={creditCards}
          />
        ) : (
          <LineValuesDescription
            entry={entry}
            showDragHandle={draggable}
          />
        )}
      </td>

      <td className="px-6 py-4 text-right">
        {isEditing ? (
          <LineEditingAmount
            value={editingForm.amount}
            onChange={(e) =>
              onEditingFormChange((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
          />
        ) : isEditingInvoice ? (
          <LineEditingAmount
            value={editingInvoiceForm.amount}
            onChange={(e) =>
              onEditingInvoiceFormChange((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
          />
        ) : (
          <LineValuesAmount entry={entry} />
        )}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          {isEditingAny ? (
            <LineActionsEditing
              onSave={isEditing ? onSaveEdit : onSaveInvoice}
              onCancel={isEditing ? onCancelEdit : onCancelInvoice}
              pending={updateTransactionPending || updateInvoicePending}
              hasError={Boolean(updateTransactionError || updateInvoiceError)}
            />
          ) : (
            <LineActionsValues
              entry={entry}
              onStartEdit={onStartEdit}
              onOpenPaymentModal={onOpenPaymentModal}
            />
          )}
        </div>
      </td>
    </tr>
  );
});

export const TransactionsTable = memo(function TransactionsTable({
  entries,
  transactionsLoading,
  invoicesLoading,
  editingId,
  editingForm,
  onEditingFormChange,
  editingInvoiceId,
  editingInvoiceForm,
  onEditingInvoiceFormChange,
  onSaveEdit,
  onCancelEdit,
  onSaveInvoice,
  onCancelInvoice,
  onStartEdit,
  onOpenPaymentModal,
  updateTransactionPending,
  updateTransactionError,
  updateInvoicePending,
  updateInvoiceError,
  creditCards,
  onReorderTransactions,
  reorderPending,
}) {
  const [localEntries, setLocalEntries] = useState(entries);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const transactionEntries = useMemo(
    () => localEntries.filter((entry) => entry.kind === "TRANSACTION"),
    [localEntries]
  );

  const invoiceEntries = useMemo(
    () => localEntries.filter((entry) => entry.kind !== "TRANSACTION"),
    [localEntries]
  );

  const reorderTransactions = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return transactionEntries;
    const next = [...transactionEntries];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleDragStart = (entry) => (event) => {
    if (reorderPending) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entry.id);
    setDraggingId(entry.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragOver = (entry) => (event) => {
    if (reorderPending) return;
    event.preventDefault();
    if (entry?.id) {
      setDragOverId(entry.id);
    }
  };

  const handleDrop = (entry) => (event) => {
    if (reorderPending) return;
    event.preventDefault();
    const draggedId = draggingId || event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === entry.id) {
      setDragOverId(null);
      return;
    }

    const fromIndex = transactionEntries.findIndex((t) => t.id === draggedId);
    const toIndex = transactionEntries.findIndex((t) => t.id === entry.id);
    if (fromIndex < 0 || toIndex < 0) {
      setDragOverId(null);
      return;
    }

    const nextTransactions = reorderTransactions(fromIndex, toIndex);
    const nextEntries = [...nextTransactions, ...invoiceEntries];
    setLocalEntries(nextEntries);
    setDragOverId(null);
    setDraggingId(null);

    if (onReorderTransactions) {
      onReorderTransactions(nextTransactions);
    }
  };

  if (transactionsLoading || invoicesLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-medium">Sincronizando dados...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-400">
        <History size={48} strokeWidth={1} className="mb-4 opacity-20" />
        <p className="text-sm italic">Nenhum lançamento encontrado neste período.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0">
        <TransactionsTableHeader />
        <tbody className="divide-y divide-gray-100 bg-white">
          {localEntries.map((entry) => {
            const isTransaction = entry.kind === "TRANSACTION";
            const isDraggable =
              isTransaction &&
              !reorderPending &&
              editingId !== entry.id &&
              editingInvoiceId !== entry.invoiceId;

            return (
              <TransactionsTableRow
                key={entry.id || entry.invoiceId}
                entry={entry}
                editingId={editingId}
                editingForm={editingForm}
                onEditingFormChange={onEditingFormChange}
                editingInvoiceId={editingInvoiceId}
                editingInvoiceForm={editingInvoiceForm}
                onEditingInvoiceFormChange={onEditingInvoiceFormChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onSaveInvoice={onSaveInvoice}
                onCancelInvoice={onCancelInvoice}
                onStartEdit={onStartEdit}
                onOpenPaymentModal={onOpenPaymentModal}
                updateTransactionPending={updateTransactionPending}
                updateTransactionError={updateTransactionError}
                updateInvoicePending={updateInvoicePending}
                updateInvoiceError={updateInvoiceError}
                creditCards={creditCards}
                draggable={isDraggable}
                isDragOver={isTransaction && dragOverId === entry.id}
                onDragStart={isTransaction ? handleDragStart(entry) : undefined}
                onDragEnd={isTransaction ? handleDragEnd : undefined}
                onDragOver={isTransaction ? handleDragOver(entry) : undefined}
                onDrop={isTransaction ? handleDrop(entry) : undefined}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
});



