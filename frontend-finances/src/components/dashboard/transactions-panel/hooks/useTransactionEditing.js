import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { periodService } from "../../../../services/periodService";
import { transactionService } from "../../../../services/transactionService";
import { createTransactionDraft, DEFAULT_TRANSACTION_DRAFT } from "../utils/formDefaults";
import { ensureTransactionCategory } from "../utils/ensureTransactionCategory";
import { getProblemDetailMessage } from "../utils/errorUtils";
import { transactionsQueryKeys } from "../utils/queryKeys";

export const useTransactionEditing = ({
  periods,
  transactionCategories,
}) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editingScope, setEditingScope] = useState("SINGLE");
  const form = useForm({
    defaultValues: DEFAULT_TRANSACTION_DRAFT,
  });

  const cancelEdit = () => {
    updateTransaction.reset();
    setEditingId(null);
    setEditingScope("SINGLE");
    form.reset(DEFAULT_TRANSACTION_DRAFT);
  };

  const startEdit = (entry) => {
    updateTransaction.reset();
    setEditingId(entry.id);
    setEditingScope("SINGLE");
    form.reset(createTransactionDraft(entry));
  };

  const updateTransaction = useMutation({
    mutationFn: async (draft) => {
      if (!editingId) {
        throw new Error("Transacao invalida.");
      }

      const category = await ensureTransactionCategory({
        categoryId: draft.categoryId,
        categoryName: draft.categoryName,
        transactionCategories,
        queryClient,
      });

      const payload = {
        description: draft.description,
        type: draft.type,
        category,
        responsibleUserId: draft.responsibleUserId || null,
      };

      if (draft.amount !== "") {
        const amountNumber = Number(draft.amount);
        if (Number.isNaN(amountNumber) || amountNumber <= 0) {
          throw new Error("Informe um valor valido.");
        }
        payload.amount = amountNumber;
      }

      if (editingScope === "SINGLE" || !draft.recurringGroupId) {
        return transactionService.updatePartial(editingId, payload);
      }

      if (!Array.isArray(periods) || periods.length === 0) {
        throw new Error("Nao foi possivel carregar os periodos para editar em grupo.");
      }

      const transactionsByPeriod = await Promise.all(
        periods.map((period) => periodService.getTransactionsByPeriod(period))
      );

      const recurringTransactions = transactionsByPeriod
        .flat()
        .filter((transaction) => transaction.recurringGroupId === draft.recurringGroupId);

      if (recurringTransactions.length === 0) {
        throw new Error("Nenhuma transacao recorrente encontrada para este grupo.");
      }

      await Promise.all(
        recurringTransactions.map((transaction) =>
          transactionService.updatePartial(transaction.id, payload)
        )
      );

      return recurringTransactions;
    },
    onSuccess: async () => {
      cancelEdit();
      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodTransactionsRoot(),
      });
    },
  });

  return {
    form,
    editingId,
    editingScope,
    setEditingScope,
    startEdit,
    cancelEdit,
    submitEdit: form.handleSubmit((values) => updateTransaction.mutate(values)),
    updateTransaction,
    updateTransactionError: useMemo(
      () =>
        updateTransaction.isError
          ? getProblemDetailMessage(
              updateTransaction.error,
              "Nao foi possivel atualizar a transacao."
            )
          : null,
      [updateTransaction.error, updateTransaction.isError]
    ),
  };
};
