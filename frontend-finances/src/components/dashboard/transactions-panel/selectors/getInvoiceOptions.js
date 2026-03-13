export const getInvoiceOptions = (entries) =>
  entries.filter((entry) => entry.kind === "INVOICE");
