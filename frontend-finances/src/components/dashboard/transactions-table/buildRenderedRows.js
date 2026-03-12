export const buildRenderedRows = ({
  groupByResponsible,
  localEntries,
  responsibleOptions,
  responsibleLabelById,
}) => {
  if (!groupByResponsible) {
    return localEntries.map((entry) => ({
      type: "entry",
      entry,
      key: entry.id || entry.invoiceId,
    }));
  }

  const rows = [];
  const transactions = localEntries.filter((entry) => entry.kind === "TRANSACTION");
  const invoices = localEntries.filter((entry) => entry.kind !== "TRANSACTION");

  const grouped = new Map();
  transactions.forEach((entry) => {
    const groupId = entry.responsibleUserId || "__unassigned__";
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId).push(entry);
  });

  const orderedGroupIds = [
    ...responsibleOptions.map((option) => option.id),
    ...Array.from(grouped.keys()).filter(
      (groupId) =>
        groupId !== "__unassigned__" &&
        !responsibleOptions.some((option) => option.id === groupId)
    ),
    "__unassigned__",
  ].filter(
    (groupId, index, all) => grouped.has(groupId) && all.indexOf(groupId) === index
  );

  orderedGroupIds.forEach((groupId) => {
    const label =
      groupId === "__unassigned__"
        ? "Sem responsavel"
        : responsibleLabelById.get(groupId) || "Responsavel";

    rows.push({ type: "group", key: `group-${groupId}`, label });
    grouped.get(groupId).forEach((entry) => {
      rows.push({ type: "entry", key: entry.id || entry.invoiceId, entry });
    });
  });

  if (invoices.length > 0) {
    rows.push({ type: "group", key: "group-invoices", label: "Faturas" });
    invoices.forEach((entry) => {
      rows.push({ type: "entry", key: entry.id || entry.invoiceId, entry });
    });
  }

  return rows;
};
