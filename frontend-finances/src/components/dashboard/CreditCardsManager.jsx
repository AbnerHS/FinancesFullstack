import { CreditCard, Pencil, Plus, X } from "lucide-react";
import { useCreditCardManager } from "../../hooks/useCreditCardManager";

export const CreditCardsManager = ({ creditCards, userId }) => {
  const {
    form,
    setForm,
    isEditing,
    editingCard,
    saveMutation,
    errorMessage,
    startCreate,
    startEdit,
    cancelEdit,
  } = useCreditCardManager({ userId });

  const onSubmit = (event) => {
    event.preventDefault();
    saveMutation.mutate();
  };

  return (
    <div className="rounded-[1.75rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          <CreditCard size={16} /> Cartoes de Credito
        </h3>
        {!isEditing && (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] hover:bg-white"
          >
            <Plus size={14} />
            Novo
          </button>
        )}
      </div>

      <div className="mb-4 space-y-2 max-h-40 overflow-y-auto pr-1">
        {creditCards.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Nenhum cartao cadastrado.</p>
        )}
        {creditCards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-[1rem] border border-[var(--color-line)] bg-white px-3 py-2"
          >
            <span className="text-sm font-medium text-[var(--color-ink-strong)]">{card.name}</span>
            <button
              type="button"
              onClick={() => startEdit(card)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-[var(--color-accent-strong)] hover:bg-[var(--color-accent-soft)]"
            >
              <Pencil size={12} />
              Editar
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          {isEditing ? "Editar cartao" : "Novo cartao"}
        </label>
        <input
          value={form.name}
          onChange={(e) => setForm({ name: e.target.value })}
          placeholder="Ex.: Nubank Roxinho"
          className="app-input"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="app-button-primary flex-1 disabled:opacity-50"
          >
            {saveMutation.isPending
              ? "Salvando..."
              : isEditing
              ? "Salvar edicao"
              : "Criar cartao"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-muted)] hover:bg-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {isEditing && editingCard?.name && (
          <p className="text-xs text-[var(--color-muted)]">Editando: {editingCard.name}</p>
        )}
        {errorMessage && <p className="text-xs text-[var(--color-danger)]">{errorMessage}</p>}
      </form>
    </div>
  );
};
