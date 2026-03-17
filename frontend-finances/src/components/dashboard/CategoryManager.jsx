import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tags } from "lucide-react";

import { transactionCategoryService } from "../../services/transactionCategoryService";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Nao foi possivel salvar a categoria.";

export const CategoryManager = ({ categories }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = draft.trim();
      if (!name) {
        throw new Error("Informe um nome para a categoria.");
      }

      return transactionCategoryService.create({ name });
    },
    onSuccess: async () => {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["transaction-categories"] });
    },
  });

  const errorMessage = useMemo(
    () => (createMutation.error ? getErrorMessage(createMutation.error) : null),
    [createMutation.error]
  );

  return (
    <section className="app-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Categorias</p>
          <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
            Base de classificacao
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            Crie categorias sem sair do dashboard para manter a composicao das transacoes fluida.
          </p>
        </div>

        <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
          <Tags size={18} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">Nenhuma categoria cadastrada.</p>
          )}
          {categories.map((category) => (
            <span
              key={category.id}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-3 py-2 text-sm text-[var(--color-ink)]"
            >
              {category.name}
            </span>
          ))}
        </div>

        <form
          className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label className="block text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Nova categoria
          </label>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ex.: Educacao"
            className="mt-3 app-input"
          />

          <button type="submit" className="mt-3 app-button-primary w-full" disabled={createMutation.isPending}>
            <Plus size={16} />
            {createMutation.isPending ? "Salvando..." : "Criar categoria"}
          </button>

          {errorMessage && <p className="mt-3 text-sm text-[var(--color-danger)]">{errorMessage}</p>}
        </form>
      </div>
    </section>
  );
};
