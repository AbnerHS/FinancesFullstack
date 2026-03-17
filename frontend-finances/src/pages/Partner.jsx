import { Users } from "lucide-react";

import { PlanPartnerManager } from "../components/dashboard/PlanPartnerManager";
import { useDashboard } from "../hooks/useDashboard";

const Partner = () => {
  const { activePlan, responsibleOptions } = useDashboard();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section>
        <PlanPartnerManager activePlan={activePlan} />
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="app-eyebrow">Participantes</p>
            <h2 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
              Responsaveis do plano
            </h2>
          </div>
          <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
            <Users size={18} />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {responsibleOptions.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              O plano ativo ainda nao possui participantes adicionais.
            </p>
          )}
          {responsibleOptions.map((option) => (
            <div
              key={option.id}
              className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{option.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Partner;
