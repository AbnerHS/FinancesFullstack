import { memo } from "react";
import { Calendar } from "lucide-react";

export const DashboardSidebar = memo(function DashboardSidebar({
  plans,
  selectedPlanId,
  onSelectPlanId,
  periods,
  periodsLoading,
  selectedPeriodIds,
  onTogglePeriodId,
}) {
  const formatPeriodLabel = (period) => {
    const monthName = new Date(period.year, period.month - 1, 1).toLocaleString(
      "pt-BR",
      { month: "long" }
    );
    return `${monthName}/${period.year}`;
  };

  return (
    <aside className="space-y-6 lg:col-span-2">
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">
            Meus Planos
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelectPlanId(plan.id)}
              className={`w-full px-4 py-2 rounded-lg text-left text-sm font-medium transition ${
                plan.id === selectedPlanId
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 font-bold text-gray-800 uppercase text-xs tracking-wider flex items-center gap-2">
          <Calendar size={16} /> Periodos Disponiveis
        </h3>
        {periodsLoading ? (
          <div className="text-sm text-gray-400">Carregando periodos...</div>
        ) : (
          <div className="flex flex-col gap-2">
            {periods.map((period) => (
              <button
                key={period.id}
                type="button"
                onClick={() => onTogglePeriodId(period.id)}
                className={`w-full flex flex-col p-3 rounded-lg border text-left transition ${
                  selectedPeriodIds.includes(period.id)
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                    : "border-gray-100 bg-white hover:border-emerald-200"
                }`}
              >
                <span className="text-sm font-bold text-gray-700">
                  {formatPeriodLabel(period)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
});
