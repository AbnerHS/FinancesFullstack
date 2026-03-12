import { ReceiptText } from "lucide-react";
import { useInvoiceManager } from "../../hooks/useInvoiceManager";

const formatPeriodLabel = (period) => {
  if (!period) return "";
  const monthName = new Date(period.year, period.month - 1, 1).toLocaleString(
    "pt-BR",
    { month: "long" }
  );
  return `${monthName}/${period.year}`;
};

export const InvoiceManager = ({
  creditCards,
  periods,
  selectedPeriodIds,
}) => {
  const { form, setForm, createInvoice, errorMessage } = useInvoiceManager({
    creditCards,
    periods,
    selectedPeriodIds,
  });

  const onSubmit = (event) => {
    event.preventDefault();
    createInvoice.mutate();
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 font-bold text-gray-800 uppercase text-xs tracking-wider flex items-center gap-2">
        <ReceiptText size={16} /> Criar Fatura
      </h3>

      <form onSubmit={onSubmit} className="space-y-2">
        <select
          value={form.creditCardId}
          onChange={(e) =>
            setForm((current) => ({ ...current, creditCardId: e.target.value }))
          }
          className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={creditCards.length === 0}
        >
          {creditCards.length === 0 && <option value="">Sem cartoes</option>}
          {creditCards.length > 0 && <option value="">Selecione o cartao</option>}
          {creditCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>

        <select
          value={form.periodId}
          onChange={(e) =>
            setForm((current) => ({ ...current, periodId: e.target.value }))
          }
          className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          disabled={periods.length === 0}
        >
          {periods.length === 0 && <option value="">Sem periodos</option>}
          {periods.length > 0 && <option value="">Selecione o periodo</option>}
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {formatPeriodLabel(period)}
            </option>
          ))}
        </select>

        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-400 text-sm">R$</span>
          <input
            type="number"
            value={form.amount}
            onChange={(e) =>
              setForm((current) => ({ ...current, amount: e.target.value }))
            }
            placeholder="0,00"
            className="w-full rounded-lg border-gray-200 pl-9 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={
            createInvoice.isPending || creditCards.length === 0 || periods.length === 0
          }
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {createInvoice.isPending ? "Criando..." : "Criar fatura"}
        </button>
      </form>

      {errorMessage && <p className="mt-2 text-xs text-rose-600">{errorMessage}</p>}
    </div>
  );
};
