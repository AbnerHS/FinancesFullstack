import ArrowDownCircle from "lucide-react/dist/esm/icons/arrow-down-circle";
import ArrowUpCircle from "lucide-react/dist/esm/icons/arrow-up-circle";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import { useTransactionsPanelState } from "./useTransactionsPanel";

const formatCurrency = (value) =>
  value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  });

const SummaryItem = ({ label, value, color, icon, isBold }) => (
  <div className="flex items-center gap-3">
    <div className={`rounded-lg bg-gray-50 p-2 ${color}`}>{icon}</div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className={`text-sm ${color} ${isBold ? "font-bold" : "font-medium"}`}>
        R$ {formatCurrency(value)}
      </p>
    </div>
  </div>
);

export const TransactionsSummary = () => {
  const { summary } = useTransactionsPanelState();

  return (
    <div className="flex items-center gap-6 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <SummaryItem
        label="Entradas"
        value={summary.incomes}
        color="text-emerald-600"
        icon={<ArrowUpCircle size={16} />}
      />
      <div className="h-8 w-px bg-gray-100" />
      <SummaryItem
        label="Saidas"
        value={summary.expenses}
        color="text-rose-600"
        icon={<ArrowDownCircle size={16} />}
      />
      <div className="h-8 w-px bg-gray-100" />
      <SummaryItem
        label="Saldo"
        value={summary.balance}
        color={summary.balance > 0 ? "text-green-600" : "text-red-600"}
        icon={<Wallet size={16} />}
        isBold
      />
    </div>
  );
};
