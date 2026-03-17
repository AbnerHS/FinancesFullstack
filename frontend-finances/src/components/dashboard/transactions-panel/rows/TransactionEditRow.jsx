import Save from "lucide-react/dist/esm/icons/save";
import X from "lucide-react/dist/esm/icons/x";
import { memo } from "react";
import { CurrencyInput } from "../../../shared/CurrencyInput";
import {
  useTransactionsPanelCommands,
  useTransactionsPanelLookups,
  useTransactionsPanelState,
} from "../useTransactionsPanel";

export const TransactionEditRow = memo(function TransactionEditRow({
  entry,
  isDragOver,
}) {
  const { editingScope } = useTransactionsPanelState();
  const { responsibleOptions, transactionCategories } = useTransactionsPanelLookups();
  const { transactionEditing } = useTransactionsPanelCommands();
  const { register, setValue, watch } = transactionEditing.form;
  const recurringGroupId = watch("recurringGroupId");
  const amount = watch("amount");

  return (
    <tr
      className={`group bg-indigo-50/30 transition-colors ${
        isDragOver ? "bg-indigo-50/60" : ""
      }`}
    >
      <td className="px-6 py-4">
        <div className="flex max-w-xs flex-col gap-2">
          <input
            className="rounded-md border-gray-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="Descricao"
            {...register("description")}
          />

          <div className="flex gap-2">
            <select
              className="flex-1 rounded-md border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
              {...register("type")}
            >
              <option value="REVENUE">Entrada</option>
              <option value="EXPENSE">Saida</option>
            </select>

            <input
              list={`transaction-category-options-${entry.id}`}
              className="flex-1 rounded-md border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
              placeholder="Categoria"
              {...register("categoryName", {
                onChange: () => setValue("categoryId", ""),
              })}
            />
            <datalist id={`transaction-category-options-${entry.id}`}>
              {transactionCategories.map((category) => (
                <option key={category.id} value={category.name} />
              ))}
            </datalist>
          </div>

          <select
            className="rounded-md border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
            {...register("responsibleUserId")}
          >
            <option value="">Geral</option>
            {responsibleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          {Boolean(recurringGroupId) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Aplicar
              </span>
              <select
                className="flex-1 rounded-md border-gray-200 bg-white px-2 py-1 text-xs shadow-sm"
                value={editingScope}
                onChange={(event) =>
                  transactionEditing.setEditingScope(event.target.value)
                }
              >
                <option value="SINGLE">Somente esta</option>
                <option value="GROUP">Todo o grupo</option>
              </select>
            </div>
          )}
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
                onClick={transactionEditing.submitEdit}
                disabled={transactionEditing.updateTransaction.isPending}
              >
                <Save size={16} />
              </button>
              <button
                title="Cancelar"
                className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-100"
                onClick={transactionEditing.cancelEdit}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {transactionEditing.updateTransactionError && (
              <span className="text-[10px] font-medium text-rose-600">
                {transactionEditing.updateTransactionError}
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
});
