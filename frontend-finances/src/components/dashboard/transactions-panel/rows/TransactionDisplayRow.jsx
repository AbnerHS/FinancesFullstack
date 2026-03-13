import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Receipt from "lucide-react/dist/esm/icons/receipt";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { memo } from "react";
import { useTransactionsPanelCommands } from "../useTransactionsPanel";

const formatCurrency = (amount) =>
  Number.parseFloat(amount || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

export const TransactionDisplayRow = memo(function TransactionDisplayRow({
  entry,
  draggable,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const { startEditEntry, transactionLinking, deleteTransaction } =
    useTransactionsPanelCommands();

  return (
    <tr
      className={`group transition-colors hover:bg-gray-50/80 ${
        isDragOver ? "bg-indigo-50/60" : ""
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {draggable && (
            <div className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing">
              <GripVertical size={16} />
            </div>
          )}
          <div className="mt-1 rounded-lg bg-gray-100 p-2 text-gray-500">
            <Receipt size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{entry.description}</p>
              {entry.category?.name && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                  {entry.category.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end">
          <span
            className={`text-md font-bold ${
              entry.type === "REVENUE" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {entry.type === "REVENUE" ? "+" : "-"} R$ {formatCurrency(entry.amount)}
          </span>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            title="Editar lancamento"
            className="rounded-md border border-transparent p-2 text-gray-400 transition-all group-hover:text-gray-600 hover:border-gray-200 hover:bg-white hover:text-indigo-600"
            onClick={() => startEditEntry(entry)}
          >
            <Pencil size={16} />
          </button>

          {entry.type === "EXPENSE" ? (
            <button
              title="Vincular a uma fatura"
              className={`rounded-md border border-transparent p-2 transition-all group-hover:text-gray-600 ${
                entry.isClearedByInvoice
                  ? "text-emerald-600 hover:border-emerald-300 hover:bg-emerald-100"
                  : "text-gray-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
              }`}
              onClick={() => transactionLinking.openPaymentModal(entry)}
            >
              <CheckCircle2 size={16} />
            </button>
          ) : (
            <div className="w-9" />
          )}

          <button
            title="Excluir transacao"
            className="rounded-md border border-transparent p-2 text-gray-400 transition-all group-hover:text-gray-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            onClick={() => deleteTransaction.mutate(entry)}
            disabled={deleteTransaction.isPending}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {deleteTransaction.errorMessage && entry.id === deleteTransaction.errorId && (
          <p className="mt-1 text-center text-[10px] text-rose-600">
            {deleteTransaction.errorMessage}
          </p>
        )}
      </td>
    </tr>
  );
});
