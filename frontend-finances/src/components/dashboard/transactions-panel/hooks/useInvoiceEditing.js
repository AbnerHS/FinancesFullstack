import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../../../../services/invoiceService";
import { createInvoiceDraft, DEFAULT_INVOICE_DRAFT } from "../utils/formDefaults";
import { getProblemDetailMessage } from "../utils/errorUtils";
import { transactionsQueryKeys } from "../utils/queryKeys";
import { parseCurrencyInput } from "../../../../utils/currency";

export const useInvoiceEditing = ({ activePeriodId }) => {
  const queryClient = useQueryClient();
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const form = useForm({
    defaultValues: DEFAULT_INVOICE_DRAFT,
  });

  const cancelInvoiceEdit = () => {
    setEditingInvoiceId(null);
    form.reset(DEFAULT_INVOICE_DRAFT);
  };

  const startInvoiceEdit = (entry) => {
    setEditingInvoiceId(entry.invoiceId);
    form.reset(createInvoiceDraft(entry));
  };

  const updateInvoice = useMutation({
    mutationFn: async (draft) => {
      if (!editingInvoiceId) {
        throw new Error("Fatura invalida.");
      }

      const amountNumber = parseCurrencyInput(draft.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor valido.");
      }
      if (!draft.creditCardId) {
        throw new Error("Selecione um cartao.");
      }

      return invoiceService.update(editingInvoiceId, {
        creditCardId: draft.creditCardId,
        periodId: draft.periodId,
        amount: amountNumber,
      });
    },
    onSuccess: async () => {
      cancelInvoiceEdit();
      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodInvoices(activePeriodId),
      });
    },
  });

  return {
    form,
    editingInvoiceId,
    startInvoiceEdit,
    cancelInvoiceEdit,
    submitInvoiceEdit: form.handleSubmit((values) => updateInvoice.mutate(values)),
    updateInvoice,
    updateInvoiceError: useMemo(
      () =>
        getProblemDetailMessage(
          updateInvoice.error,
          "Nao foi possivel atualizar a fatura."
        ),
      [updateInvoice.error]
    ),
  };
};
