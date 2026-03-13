import History from "lucide-react/dist/esm/icons/history";
import { memo, useMemo } from "react";
import {
  useTransactionsPanelCommands,
  useTransactionsPanelLookups,
  useTransactionsPanelState,
} from "./useTransactionsPanel";
import { GroupHeaderRow } from "./rows/GroupHeaderRow";
import { InvoiceDisplayRow } from "./rows/InvoiceDisplayRow";
import { InvoiceEditRow } from "./rows/InvoiceEditRow";
import { TransactionDisplayRow } from "./rows/TransactionDisplayRow";
import { TransactionEditRow } from "./rows/TransactionEditRow";
import { TransactionsTableHeader } from "./rows/TransactionsTableHeader";
import { buildRenderedRows } from "./selectors/buildRenderedRows";

export const TransactionsTable = memo(function TransactionsTable({
  groupByResponsible = true,
}) {
  const { panel, loading, editingId, editingInvoiceId } = useTransactionsPanelState();
  const { responsibleOptions, responsibleLabelById, creditCardById } =
    useTransactionsPanelLookups();
  const { reorder } = useTransactionsPanelCommands();

  const renderedRows = useMemo(
    () =>
      buildRenderedRows({
        groupByResponsible,
        entries: reorder.entries,
        responsibleOptions,
        responsibleLabelById,
      }),
    [groupByResponsible, reorder.entries, responsibleLabelById, responsibleOptions]
  );

  if (loading.transactionsLoading || loading.invoicesLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-gray-400">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <p className="text-sm font-medium">Sincronizando dados...</p>
      </div>
    );
  }

  if (panel.entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-400">
        <History size={48} strokeWidth={1} className="mb-4 opacity-20" />
        <p className="text-sm italic">Nenhum lancamento encontrado neste periodo.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-left">
        <TransactionsTableHeader />
        <tbody className="divide-y divide-gray-100 bg-white">
          {renderedRows.map((row) => {
            if (row.type === "group") {
              return <GroupHeaderRow key={row.key} label={row.label} />;
            }

            const { entry } = row;
            const isTransaction = entry.kind === "TRANSACTION";
            const isEditingTransaction = editingId === entry.id && isTransaction;
            const isEditingInvoice =
              entry.kind === "INVOICE" && editingInvoiceId === entry.invoiceId;
            const isDraggable =
              isTransaction &&
              !reorder.reorderPending &&
              !isEditingTransaction &&
              !isEditingInvoice;

            if (isEditingTransaction) {
              return (
                <TransactionEditRow
                  key={row.key}
                  entry={entry}
                  isDragOver={reorder.dragOverId === entry.id}
                />
              );
            }

            if (isEditingInvoice) {
              return <InvoiceEditRow key={row.key} />;
            }

            if (entry.kind === "INVOICE") {
              return (
                <InvoiceDisplayRow
                  key={row.key}
                  entry={entry}
                  invoiceCardName={creditCardById.get(entry.creditCardId)?.name}
                />
              );
            }

            return (
              <TransactionDisplayRow
                key={row.key}
                entry={entry}
                draggable={isDraggable}
                isDragOver={reorder.dragOverId === entry.id}
                onDragStart={(event) => reorder.startDrag(entry, event)}
                onDragEnd={reorder.endDrag}
                onDragOver={(event) => reorder.dragOver(entry, event)}
                onDrop={(event) => reorder.dropOnEntry(entry, event)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
