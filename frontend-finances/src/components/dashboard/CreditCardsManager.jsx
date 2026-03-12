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
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider flex items-center gap-2">
          <CreditCard size={16} /> Cartoes de Credito
        </h3>
        {!isEditing && (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <Plus size={14} />
            Novo
          </button>
        )}
      </div>

      <div className="mb-4 space-y-2 max-h-40 overflow-y-auto pr-1">
        {creditCards.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum cartao cadastrado.</p>
        )}
        {creditCards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
          >
            <span className="text-sm font-medium text-gray-700">{card.name}</span>
            <button
              type="button"
              onClick={() => startEdit(card)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              <Pencil size={12} />
              Editar
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {isEditing ? "Editar cartao" : "Novo cartao"}
        </label>
        <input
          value={form.name}
          onChange={(e) => setForm({ name: e.target.value })}
          placeholder="Ex.: Nubank Roxinho"
          className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
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
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {isEditing && editingCard?.name && (
          <p className="text-xs text-gray-500">Editando: {editingCard.name}</p>
        )}
        {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
      </form>
    </div>
  );
};
