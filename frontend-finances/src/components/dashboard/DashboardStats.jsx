import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { StatCard } from "./StatCard";

export const DashboardStats = ({ balance, incomes, expenses }) => (
  <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
    <StatCard
      title="Entradas"
      value={incomes}
      icon={<ArrowUpCircle className="text-emerald-600" />}
      color="emerald"
      size={"text-2xl"}
    />
    <StatCard
      title="Saídas"
      value={expenses}
      icon={<ArrowDownCircle className="text-rose-600" />}
      color="rose"
      size={"text-2xl"}
    />
    <StatCard
      title="Saldo do Periodo"
      value={balance}
      icon={<Wallet className="text-indigo-600" />}
      color={balance > 0 ? "green" : "red"}
      size={"text-2xl"}
    />
  </div>
);

