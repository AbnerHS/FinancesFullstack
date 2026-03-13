import { memo } from "react";

export const TransactionsTableHeader = memo(function TransactionsTableHeader() {
  return (
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50/50">
        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
          Detalhes
        </th>
        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
          Valor
        </th>
        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
          Status / Acoes
        </th>
      </tr>
    </thead>
  );
});
