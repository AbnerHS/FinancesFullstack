import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus2, Layers3 } from "lucide-react";

import { periodService } from "../../services/periodService";
import { formatMonthYear } from "../../utils/dashboard";

const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Marco" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Nao foi possivel salvar o periodo.";

export const PeriodsManager = ({
  activePlan,
  periods,
  selectedPeriodIds,
  onTogglePeriodId,
}) => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [draft, setDraft] = useState({ month: new Date().getMonth() + 1, year: currentYear });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan?.id) {
        throw new Error("Selecione um plano antes de criar um periodo.");
      }

      return periodService.create({
        month: Number(draft.month),
        year: Number(draft.year),
        financialPlanId: activePlan.id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["plan-periods", activePlan?.id] });
    },
  });

  const errorMessage = useMemo(
    () => (saveMutation.error ? getErrorMessage(saveMutation.error) : null),
    [saveMutation.error]
  );

  return (
    <section className="app-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Periodos</p>
          <h2 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
            Comparacao mensal e manutencao
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-muted)]">
            Selecione varios periodos para comparacao, mantendo o mesmo contexto do plano ativo.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-2 text-sm text-[var(--color-muted)]">
          <Layers3 size={16} />
          {selectedPeriodIds.length} periodos em comparacao
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
        <div className="grid gap-3 md:grid-cols-2">
          {periods.map((period) => {
            const selected = selectedPeriodIds.includes(period.id);
            return (
              <button
                key={period.id}
                type="button"
                onClick={() => onTogglePeriodId(period.id)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  selected
                    ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-soft)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel-soft)] hover:border-[var(--color-accent)]"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
                  Periodo
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">
                  {formatMonthYear(period)}
                </h3>
              </button>
            );
          })}
        </div>

        <form
          className="rounded-[1.75rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Criacao rapida</p>
              <h3 className="mt-1 font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Abrir novo periodo
              </h3>
            </div>
            <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
              <CalendarPlus2 size={16} />
            </div>
          </div>

          <label className="mt-5 block text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Mes
          </label>
          <select
            value={draft.month}
            onChange={(event) => setDraft((current) => ({ ...current, month: Number(event.target.value) }))}
            className="mt-3 app-input"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Ano
          </label>
          <input
            type="number"
            value={draft.year}
            onChange={(event) => setDraft((current) => ({ ...current, year: Number(event.target.value) }))}
            className="mt-3 app-input"
          />

          <button type="submit" className="mt-4 app-button-primary w-full" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Criando..." : "Criar periodo"}
          </button>

          {errorMessage && <p className="mt-3 text-sm text-[var(--color-danger)]">{errorMessage}</p>}
        </form>
      </div>
    </section>
  );
};
