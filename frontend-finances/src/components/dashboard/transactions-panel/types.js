/**
 * @typedef {"TRANSACTION" | "INVOICE"} EntryKind
 */

/**
 * @typedef {"REVENUE" | "EXPENSE"} TransactionType
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string
 * }} TransactionCategory
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string
 * }} ResponsibleOption
 */

/**
 * @typedef {{
 *   id: string,
 *   description: string,
 *   amount: string | number,
 *   type: TransactionType,
 *   kind: "TRANSACTION",
 *   category?: TransactionCategory | null,
 *   responsibleUserId?: string | null,
 *   recurringGroupId?: string | null,
 *   creditCardInvoiceId?: string | null,
 *   isClearedByInvoice?: boolean,
 *   order?: number | null
 * }} TransactionEntry
 */

/**
 * @typedef {{
 *   id: string,
 *   invoiceId: string,
 *   description: string,
 *   amount: string | number,
 *   type: "EXPENSE",
 *   kind: "INVOICE",
 *   creditCardId?: string | null,
 *   periodId: string
 * }} InvoiceEntry
 */

/**
 * @typedef {{
 *   description: string,
 *   amount: string | number,
 *   type: TransactionType,
 *   categoryId: string,
 *   categoryName: string,
 *   responsibleUserId: string,
 *   isRecurring: boolean,
 *   numberOfPeriods: number | string,
 *   recurringGroupId?: string | null
 * }} TransactionDraft
 */

/**
 * @typedef {{
 *   amount: string | number,
 *   creditCardId: string,
 *   periodId: string
 * }} InvoiceDraft
 */

/**
 * @typedef {{
 *   type: "group",
 *   key: string,
 *   label: string
 * } | {
 *   type: "entry",
 *   key: string,
 *   entry: TransactionEntry | InvoiceEntry
 * }} RenderedRow
 */

/**
 * @typedef {{
 *   panel: {
 *     period: { id: string, month: number, year: number } | null,
 *     entries: Array<TransactionEntry | InvoiceEntry>,
 *     transactionsLoading: boolean,
 *     invoicesLoading: boolean
 *   },
 *   shared: {
 *     userId: string | null,
 *     periods: Array<{ id: string }>,
 *     creditCards: Array<{ id: string, name: string }>,
 *     transactionCategories: TransactionCategory[],
 *     responsibleOptions: ResponsibleOption[]
 *   }
 * }} TransactionsPanelContextValue
 */

export const TRANSACTIONS_PANEL_TYPES = {};
