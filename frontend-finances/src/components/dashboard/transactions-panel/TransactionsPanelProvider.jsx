import { useMemo } from "react";
import { useInvoiceEditing } from "./hooks/useInvoiceEditing";
import { useTransactionComposer } from "./hooks/useTransactionComposer";
import { useTransactionDeleting } from "./hooks/useTransactionDeleting";
import { useTransactionEditing } from "./hooks/useTransactionEditing";
import { useTransactionLinking } from "./hooks/useTransactionLinking";
import { useTransactionReorder } from "./hooks/useTransactionReorder";
import { getLookupMaps } from "./selectors/getLookupMaps";
import { getTransactionsSummary } from "./selectors/getTransactionsSummary";
import { TransactionsPanelContext } from "./transactionsPanelContext";

const useTransactionsPanelController = ({ panel, shared }) => {
  const summary = useMemo(() => getTransactionsSummary(panel.entries), [panel.entries]);
  const lookupMaps = useMemo(
    () =>
      getLookupMaps({
        creditCards: shared.creditCards,
        responsibleOptions: shared.responsibleOptions,
      }),
    [shared.creditCards, shared.responsibleOptions]
  );

  const composer = useTransactionComposer({
    activePeriodId: panel.period?.id,
    userId: shared.userId,
    transactionCategories: shared.transactionCategories,
  });

  const transactionEditing = useTransactionEditing({
    periods: shared.periods,
    transactionCategories: shared.transactionCategories,
  });

  const invoiceEditing = useInvoiceEditing({
    activePeriodId: panel.period?.id,
  });

  const transactionLinking = useTransactionLinking({
    activePeriodId: panel.period?.id,
    entries: panel.entries,
  });

  const reorder = useTransactionReorder({
    activePeriodId: panel.period?.id,
    entries: panel.entries,
    groupByResponsible: true,
  });

  const deleteTransaction = useTransactionDeleting({
    activePeriodId: panel.period?.id,
    editingId: transactionEditing.editingId,
    onDeleteCurrentEdit: transactionEditing.cancelEdit,
  });

  const commands = {
    composer,
    transactionEditing,
    invoiceEditing,
    transactionLinking,
    reorder,
    deleteTransaction,
    startEditEntry: (entry) => {
      if (entry.kind === "INVOICE") {
        invoiceEditing.startInvoiceEdit(entry);
        return;
      }

      transactionEditing.startEdit(entry);
    },
  };

  const state = {
    panel,
    summary,
    loading: {
      transactionsLoading: panel.transactionsLoading,
      invoicesLoading: panel.invoicesLoading,
    },
    editingId: transactionEditing.editingId,
    editingInvoiceId: invoiceEditing.editingInvoiceId,
    editingScope: transactionEditing.editingScope,
    paymentModalEntry: transactionLinking.paymentModalEntry,
    selectedInvoiceId: transactionLinking.selectedInvoiceId,
  };

  const lookups = {
    ...shared,
    creditCardById: lookupMaps.creditCardById,
    responsibleLabelById: lookupMaps.responsibleLabelById,
    availableInvoices: transactionLinking.availableInvoices,
  };

  return {
    state,
    commands,
    lookups,
  };
};

export const TransactionsPanelProvider = ({ panel, shared, children }) => {
  const value = useTransactionsPanelController({ panel, shared });

  return (
    <TransactionsPanelContext.Provider value={value}>
      {children}
    </TransactionsPanelContext.Provider>
  );
};
