import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import { memo } from "react";
import { useTransactionsPanelCommands } from "../useTransactionsPanel";

const formatCurrency = (amount) =>
  Number.parseFloat(amount || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

export const InvoiceDisplayRow = memo(function InvoiceDisplayRow({
  entry,
  invoiceCardName,
}) {
  const { startEditEntry } = useTransactionsPanelCommands();
  const description = invoiceCardName ? `Fatura - ${invoiceCardName}` : entry.description;

  return (
    <tr className="group transition-colors hover:bg-gray-50/80">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="mt-1 rounded-lg bg-amber-50 p-2 text-amber-600">
            <CreditCard size={16} />
          </div>

          <div>
            <p className="font-semibold text-gray-900">{description}</p>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end">
          <span className="text-md font-bold text-rose-600">
            - R$ {formatCurrency(entry.amount)}
          </span>
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            title="Editar Lançamento"
            className="rounded-md border border-transparent p-2 text-gray-400 transition-all group-hover:text-gray-600 hover:border-gray-200 hover:bg-white hover:text-indigo-600"
            onClick={() => startEditEntry(entry)}
          >
            <Pencil size={16} />
          </button>
          <div className="w-9" />
          <div className="w-9" />
        </div>
      </td>
    </tr>
  );
});
