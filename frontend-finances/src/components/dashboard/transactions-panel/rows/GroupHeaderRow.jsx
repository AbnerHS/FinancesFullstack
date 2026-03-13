import { memo } from "react";

export const GroupHeaderRow = memo(function GroupHeaderRow({ label }) {
  return (
    <tr className="bg-gray-50/70">
      <td
        colSpan={3}
        className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500"
      >
        {label}
      </td>
    </tr>
  );
});
