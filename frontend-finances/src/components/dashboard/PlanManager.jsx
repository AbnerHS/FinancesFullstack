import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, PencilLine } from "lucide-react";

import { planService } from "../../services/planService";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Nao foi possivel salvar o plano.";

export const PlanManager = ({
  plans,
  activePlan,
  selectedPlanId,
  onSelectPlanId,
  userId,
}) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("create");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = draft.trim();
      if (!name) {
        throw new Error("Informe um nome para o plano.");
      }

      if (mode === "edit" && activePlan?.id) {
        return planService.update(activePlan.id, {
          name,
          ownerId: activePlan.ownerId,
          partnerId: activePlan.partnerId || null,
        });
      }

      if (!userId) {
        throw new Error("Usuario nao identificado.");
      }

      return planService.create({ name, ownerId: userId, partnerId: null });
    },
    onSuccess: async (response) => {
      const nextPlanId = response?.id || response?.content?.id || response?.data?.id || null;
      await queryClient.invalidateQueries({ queryKey: ["plans-me"] });
      if (nextPlanId) {
        onSelectPlanId(nextPlanId);
      }
      setMode("create");
      setDraft("");
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
          <p className="app-eyebrow">Planos Financeiros</p>
          <h2 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
            Estrutura dos seus espacos financeiros
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-muted)]">
            Troque rapidamente o plano ativo, renomeie o contexto atual e mantenha um cadastro limpo para a navegacao do dashboard.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const isActive = plan.id === selectedPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelectPlanId(plan.id)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  isActive
                    ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white shadow-[0_22px_48px_rgba(17,60,58,0.18)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel-soft)] text-[var(--color-ink)] hover:border-[var(--color-accent)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isActive && (
                    <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] uppercase tracking-[0.22em]">
                      Ativo
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm ${isActive ? "text-white/80" : "text-[var(--color-muted)]"}`}>
                  {plan.partnerId ? "Compartilhado com parceiro" : "Plano individual"}
                </p>
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
              <p className="app-eyebrow">Edicao</p>
              <h3 className="mt-1 font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                {mode === "edit" ? "Editar plano ativo" : "Criar novo plano"}
              </h3>
            </div>

            <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
              {mode === "edit" ? <PencilLine size={16} /> : <FolderPlus size={16} />}
            </div>
          </div>

          <div className="mt-5 flex gap-2 rounded-full bg-[var(--color-panel)] p-1">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                mode === "create"
                  ? "bg-[var(--color-accent-strong)] text-white"
                  : "text-[var(--color-muted)]"
              }`}
              onClick={() => {
                setMode("create");
                setDraft("");
              }}
            >
              Criar
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                mode === "edit"
                  ? "bg-[var(--color-accent-strong)] text-white"
                  : "text-[var(--color-muted)]"
              }`}
              onClick={() => {
                setMode("edit");
                setDraft(activePlan?.name || "");
              }}
              disabled={!activePlan}
            >
              Editar
            </button>
          </div>

          <label className="mt-5 block text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Nome do plano
          </label>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-3 app-input"
            placeholder="Ex.: Casa e rotina"
          />

          <button type="submit" className="mt-4 app-button-primary w-full" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : mode === "edit" ? "Salvar nome" : "Criar plano"}
          </button>

          {errorMessage && <p className="mt-3 text-sm text-[var(--color-danger)]">{errorMessage}</p>}
        </form>
      </div>
    </section>
  );
};
