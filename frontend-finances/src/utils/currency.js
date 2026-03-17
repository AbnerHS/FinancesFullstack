export const formatCurrency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const getCurrencyDigits = (value) => String(value || "").replace(/\D/g, "");

export const formatCurrencyInput = (value) => {
  const digits = getCurrencyDigits(value);

  if (!digits) {
    return "";
  }

  const amount = Number(digits) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrencyInputFromValue = (value) => {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue) || numericValue <= 0) {
    return numericValue === 0 ? "0,00" : "";
  }

  return numericValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parseCurrencyInput = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");

  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
};
