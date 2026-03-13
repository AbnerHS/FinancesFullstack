import Info from "lucide-react/dist/esm/icons/info";
import Plus from "lucide-react/dist/esm/icons/plus";
import Tag from "lucide-react/dist/esm/icons/tag";
import {
  useTransactionsPanelCommands,
  useTransactionsPanelLookups,
  useTransactionsPanelState,
} from "./useTransactionsPanel";

export const TransactionComposer = () => {
  const { panel } = useTransactionsPanelState();
  const { responsibleOptions, transactionCategories } = useTransactionsPanelLookups();
  const { composer } = useTransactionsPanelCommands();
  const { register, watch, setValue } = composer.form;
  const isRecurring = watch("isRecurring");

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all ${
        composer.canCreate
          ? "border-gray-200 bg-white shadow-sm"
          : "border-dashed border-gray-300 bg-gray-50"
      }`}
    >
      {!composer.canCreate && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/60 backdrop-blur-[1px]">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Info size={16} /> Selecione um periodo para habilitar lancamentos
          </p>
        </div>
      )}

      <form className="p-4" onSubmit={composer.submitCreate}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <input
              className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="O que voce comprou ou recebeu?"
              {...register("description")}
            />
          </div>

          <div className="md:col-span-2">
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-gray-400">R$</span>
              <input
                type="number"
                className="w-full rounded-lg border-gray-200 py-2 pl-9 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="0,00"
                {...register("amount")}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <select
              className="w-full rounded-lg border-gray-200 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              {...register("type")}
            >
              <option value="REVENUE">Entrada</option>
              <option value="EXPENSE">Saida</option>
            </select>
          </div>

          <div className="relative md:col-span-2">
            <Tag className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              list={`transaction-categories-${panel.period?.id || "default"}`}
              className="w-full rounded-lg border-gray-200 py-2 pl-9 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Categoria"
              {...register("categoryName", {
                onChange: () => setValue("categoryId", ""),
              })}
            />
            <datalist id={`transaction-categories-${panel.period?.id || "default"}`}>
              {transactionCategories.map((category) => (
                <option key={category.id} value={category.name} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <select
              className="w-full rounded-lg border-gray-200 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              {...register("responsibleUserId")}
            >
              <option value="">Geral</option>
              {responsibleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 md:col-span-10">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                {...register("isRecurring", {
                  onChange: (event) => {
                    const checked = event.target.checked;
                    if (checked) {
                      const current = Number(composer.form.getValues("numberOfPeriods"));
                      setValue("numberOfPeriods", current >= 2 ? current : 2);
                    }
                  },
                })}
              />
              Recorrente
            </label>

            {isRecurring && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Periodos</span>
                <input
                  type="number"
                  min="2"
                  className="w-16 rounded-lg border-gray-200 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  {...register("numberOfPeriods")}
                />
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={composer.createTransaction.isPending || !composer.canCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus size={18} />
              {composer.createTransaction.isPending ? "..." : "Lancar"}
            </button>
          </div>
        </div>

        {composer.createTransaction.isError && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-rose-600">
              {composer.createTransactionError}
            </p>
            {composer.createTransactionErrors.length > 0 && (
              <ul className="list-disc pl-4 text-xs text-rose-600">
                {composer.createTransactionErrors.map((errorItem) => (
                  <li key={errorItem}>{errorItem}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </div>
  );
};
