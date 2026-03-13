export const buildRenderedRows = ({
  groupByResponsible,
  entries,
  responsibleOptions,
  responsibleLabelById,
}) => {
  if (!groupByResponsible) {
    return entries.map((entry) => ({
      type: "entry",
      entry,
      key: entry.id || entry.invoiceId,
    }));
  }

  const rows = [];
  const transactions = entries.filter((entry) => entry.kind === "TRANSACTION");
  const invoices = entries.filter((entry) => entry.kind !== "TRANSACTION");

  const grouped = new Map();
  for (const entry of transactions) {
    const groupId = entry.responsibleUserId || "__unassigned__";
    if (!grouped.has(groupId)) {
      grouped.set(groupId, []);
    }
    grouped.get(groupId).push(entry);
  }

  const knownResponsibleIds = new Set(responsibleOptions.map((option) => option.id));
  const orderedGroupIds = [
    ...responsibleOptions.map((option) => option.id),
    ...Array.from(grouped.keys()).filter(
      (groupId) => groupId !== "__unassigned__" && !knownResponsibleIds.has(groupId)
    ),
    "__unassigned__",
  ].filter(
    (groupId, index, all) => grouped.has(groupId) && all.indexOf(groupId) === index
  );

  for (const groupId of orderedGroupIds) {
    const label =
      groupId === "__unassigned__"
        ? "Sem responsavel"
        : responsibleLabelById.get(groupId) || "Responsavel";

    rows.push({ type: "group", key: `group-${groupId}`, label });

    for (const entry of grouped.get(groupId)) {
      rows.push({ type: "entry", key: entry.id || entry.invoiceId, entry });
    }
  }

  if (invoices.length > 0) {
    rows.push({ type: "group", key: "group-invoices", label: "Faturas" });

    for (const entry of invoices) {
      rows.push({ type: "entry", key: entry.id || entry.invoiceId, entry });
    }
  }

  return rows;
};
