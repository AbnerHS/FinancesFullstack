const colorVariants = {
  emerald: {
    value: "text-emerald-600",
    icon: "bg-emerald-100",
  },
  rose: {
    value: "text-rose-600",
    icon: "bg-rose-100",
  },
  green: {
    value: "text-green-600",
    icon: "bg-emerald-100",
  },
  red: {
    value: "text-red-600",
    icon: "bg-rose-100",
  },
  indigo: {
    value: "text-indigo-600",
    icon: "bg-indigo-100",
  },
};

export const StatCard = ({ title, value, icon, color, size }) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <h3
        className={`mt-1 font-bold ${size} ${
          colorVariants[color]?.value ?? "text-gray-900"
        }`}
      >
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </h3>
    </div>
    {icon && (
      <div
        className={`rounded-lg p-3 ${
          colorVariants[color]?.icon ?? "bg-gray-100"
        }`}
      >
        {icon}
      </div>
    )}
  </div>
);

