import { ReceiptText } from "lucide-react";
import { CurrencyInput } from "../shared/CurrencyInput";
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
    <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-muted)]">
        <ReceiptText size={16} /> Criar Fatura
      </h3>

      <form onSubmit={onSubmit} className="space-y-2">
        <select
          value={form.creditCardId}
          onChange={(e) =>
            setForm((current) => ({ ...current, creditCardId: e.target.value }))
          }
          className="app-input"
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
          className="app-input"
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

        <CurrencyInput
          value={form.amount}
          onValueChange={(nextValue) =>
            setForm((current) => ({ ...current, amount: nextValue }))
          }
          className="app-input"
        />

        <button
          type="submit"
          disabled={
            createInvoice.isPending || creditCards.length === 0 || periods.length === 0
          }
          className="app-button-primary w-full disabled:opacity-50"
        >
          {createInvoice.isPending ? "Criando..." : "Criar fatura"}
        </button>
      </form>

      {errorMessage && <p className="mt-2 text-xs text-[var(--color-danger)]">{errorMessage}</p>}
    </div>
  );
};
