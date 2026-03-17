import Save from "lucide-react/dist/esm/icons/save";
import X from "lucide-react/dist/esm/icons/x";
import { memo } from "react";
import { CurrencyInput } from "../../../shared/CurrencyInput";
import {
  useTransactionsPanelCommands,
  useTransactionsPanelLookups,
} from "../useTransactionsPanel";

export const InvoiceEditRow = memo(function InvoiceEditRow() {
  const { creditCards } = useTransactionsPanelLookups();
  const { invoiceEditing } = useTransactionsPanelCommands();
  const { register, watch, setValue } = invoiceEditing.form;
  const amount = watch("amount");

  return (
    <tr className="group bg-indigo-50/30 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase text-indigo-600">
            Editando Fatura
          </span>
          <select
            className="rounded-md border-gray-200 bg-white px-2 py-1.5 text-sm shadow-sm"
            {...register("creditCardId")}
          >
            <option value="">Selecione o cartão</option>
            {creditCards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
          <input type="hidden" {...register("periodId")} />
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex justify-end">
          <CurrencyInput
            value={amount}
            onValueChange={(nextValue) =>
              setValue("amount", nextValue, { shouldDirty: true, shouldValidate: true })
            }
            className="w-32 rounded-md border-gray-200 bg-white py-1.5 pr-2 text-sm font-bold shadow-sm"
            align="right"
          />
        </div>
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <button
                title="Salvar"
                className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                onClick={invoiceEditing.submitInvoiceEdit}
                disabled={invoiceEditing.updateInvoice.isPending}
              >
                <Save size={16} />
              </button>
              <button
                title="Cancelar"
                className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-100"
                onClick={invoiceEditing.cancelInvoiceEdit}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {invoiceEditing.updateInvoiceError && (
              <span className="text-[10px] font-medium text-rose-600">
                {invoiceEditing.updateInvoiceError}
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
});
