export const StatCard = ({ title, value, icon, color, size }) => (
  <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <h3 className={`mt-1 ${size} font-bold text-${color}-600`}>
        R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </h3>
    </div>
    {icon && <div className={`p-3 rounded-lg bg-${color}-100`}>{icon}</div>}
  </div>
);

