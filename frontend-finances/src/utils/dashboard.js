export const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatMonthYear = (period) => {
  if (!period) {
    return "";
  }

  const date = new Date(period.year, period.month - 1, 1);
  const month = date.toLocaleString("pt-BR", { month: "long" });
  return `${month}/${period.year}`;
};

export const slugifyLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
