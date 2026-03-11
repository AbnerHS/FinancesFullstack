import { Plus } from "lucide-react";

export const DashboardHeader = ({ onNewPlan }) => (
  <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Visao Geral</h1>
      <p className="text-gray-500">Gerencie seus planos e fluxos de caixa.</p>
    </div>
    <button
      type="button"
      onClick={onNewPlan}
      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition"
    >
      <Plus size={20} /> Novo Plano
    </button>
  </div>
);

