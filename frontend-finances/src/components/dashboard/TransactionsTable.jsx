import { memo, useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import {
  GroupHeaderRow,
  TransactionsTableHeader,
  TransactionsTableRow,
} from "./transactions-table/TransactionsTableParts";
import { buildRenderedRows } from "./transactions-table/buildRenderedRows";

export const TransactionsTable = memo(function TransactionsTable({
  entries,
  transactionsLoading,
  invoicesLoading,
  editingId,
  editingForm,
  onEditingFormChange,
  editingScope,
  onEditingScopeChange,
  responsibleOptions = [],
  groupByResponsible = false,
  editingInvoiceId,
  editingInvoiceForm,
  onEditingInvoiceFormChange,
  onSaveEdit,
  onCancelEdit,
  onSaveInvoice,
  onCancelInvoice,
  onStartEdit,
  onOpenPaymentModal,
  onDeleteTransaction,
  updateTransactionPending,
  updateTransactionError,
  updateInvoicePending,
  updateInvoiceError,
  deleteTransactionPending,
  deleteTransactionError,
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

  const responsibleLabelById = useMemo(
    () => new Map(responsibleOptions.map((option) => [option.id, option.label])),
    [responsibleOptions]
  );
  const creditCardNameById = useMemo(
    () => new Map((creditCards || []).map((card) => [card.id, card.name])),
    [creditCards]
  );

  const renderedRows = useMemo(
    () =>
      buildRenderedRows({
        groupByResponsible,
        localEntries,
        responsibleOptions,
        responsibleLabelById,
      }),
    [groupByResponsible, localEntries, responsibleLabelById, responsibleOptions]
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
    if (entry?.id) setDragOverId(entry.id);
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

    if (onReorderTransactions) onReorderTransactions(nextTransactions);
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
          {renderedRows.map((row) => {
            if (row.type === "group") {
              return <GroupHeaderRow key={row.key} label={row.label} />;
            }

            const { entry } = row;
            const isTransaction = entry.kind === "TRANSACTION";
            const isDraggable =
              isTransaction &&
              !groupByResponsible &&
              !reorderPending &&
              editingId !== entry.id &&
              editingInvoiceId !== entry.invoiceId;

            return (
              <TransactionsTableRow
                key={row.key}
                entry={entry}
                editingId={editingId}
                editingForm={editingForm}
                onEditingFormChange={onEditingFormChange}
                editingScope={editingScope}
                onEditingScopeChange={onEditingScopeChange}
                responsibleOptions={responsibleOptions}
                invoiceCardName={creditCardNameById.get(entry.creditCardId)}
                editingInvoiceId={editingInvoiceId}
                editingInvoiceForm={editingInvoiceForm}
                onEditingInvoiceFormChange={onEditingInvoiceFormChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onSaveInvoice={onSaveInvoice}
                onCancelInvoice={onCancelInvoice}
                onStartEdit={onStartEdit}
                onOpenPaymentModal={onOpenPaymentModal}
                onDeleteTransaction={onDeleteTransaction}
                updateTransactionPending={updateTransactionPending}
                updateTransactionError={updateTransactionError}
                updateInvoicePending={updateInvoicePending}
                updateInvoiceError={updateInvoiceError}
                deleteTransactionPending={deleteTransactionPending}
                deleteTransactionError={deleteTransactionError}
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
