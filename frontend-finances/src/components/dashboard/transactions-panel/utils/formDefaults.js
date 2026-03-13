/**
 * @typedef {import("../types").TransactionDraft} TransactionDraft
 * @typedef {import("../types").InvoiceDraft} InvoiceDraft
 */

/** @type {TransactionDraft} */
export const DEFAULT_TRANSACTION_DRAFT = {
  description: "",
  amount: "",
  type: "EXPENSE",
  categoryId: "",
  categoryName: "",
  responsibleUserId: "",
  isRecurring: false,
  numberOfPeriods: 2,
  recurringGroupId: null,
};

/** @type {InvoiceDraft} */
export const DEFAULT_INVOICE_DRAFT = {
  amount: "",
  creditCardId: "",
  periodId: "",
};

export const createTransactionDraft = (entry) => ({
  ...DEFAULT_TRANSACTION_DRAFT,
  description: entry?.description || "",
  amount: entry?.amount || "",
  type: entry?.type || "EXPENSE",
  categoryId: entry?.category?.id || "",
  categoryName: entry?.category?.name || "",
  responsibleUserId: entry?.responsibleUserId || "",
  recurringGroupId: entry?.recurringGroupId || null,
});

export const createInvoiceDraft = (entry) => ({
  ...DEFAULT_INVOICE_DRAFT,
  amount: entry?.amount || "",
  creditCardId: entry?.creditCardId || "",
  periodId: entry?.periodId || "",
});
