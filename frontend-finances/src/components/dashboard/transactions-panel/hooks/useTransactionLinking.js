import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "../../../../services/transactionService";
import { getInvoiceOptions } from "../selectors/getInvoiceOptions";
import { getProblemDetailMessage } from "../utils/errorUtils";
import { transactionsQueryKeys } from "../utils/queryKeys";

export const useTransactionLinking = ({ activePeriodId, entries }) => {
  const queryClient = useQueryClient();
  const [paymentModalEntry, setPaymentModalEntry] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const closePaymentModal = () => {
    setPaymentModalEntry(null);
    setSelectedInvoiceId("");
  };

  const openPaymentModal = (entry) => {
    setPaymentModalEntry(entry);
    setSelectedInvoiceId(entry?.creditCardInvoiceId || "");
  };

  const linkTransactionToInvoice = useMutation({
    mutationFn: async () => {
      if (!paymentModalEntry?.id) {
        throw new Error("Transacao invalida.");
      }
      if (!selectedInvoiceId) {
        throw new Error("Selecione uma fatura.");
      }

      return transactionService.updatePartial(paymentModalEntry.id, {
        isClearedByInvoice: true,
        creditCardInvoiceId: selectedInvoiceId,
      });
    },
    onSuccess: async () => {
      closePaymentModal();
      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodTransactions(activePeriodId),
      });
    },
  });

  return {
    paymentModalEntry,
    selectedInvoiceId,
    setSelectedInvoiceId,
    openPaymentModal,
    closePaymentModal,
    linkTransactionToInvoice,
    availableInvoices: useMemo(() => getInvoiceOptions(entries), [entries]),
    linkTransactionError: useMemo(
      () =>
        getProblemDetailMessage(
          linkTransactionToInvoice.error,
          "Nao foi possivel vincular a transacao."
        ),
      [linkTransactionToInvoice.error]
    ),
  };
};
