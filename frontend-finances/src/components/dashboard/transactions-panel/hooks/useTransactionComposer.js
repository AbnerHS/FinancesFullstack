import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "../../../../services/transactionService";
import { DEFAULT_TRANSACTION_DRAFT } from "../utils/formDefaults";
import { ensureTransactionCategory } from "../utils/ensureTransactionCategory";
import { getProblemDetailErrors, getProblemDetailMessage } from "../utils/errorUtils";
import { transactionsQueryKeys } from "../utils/queryKeys";

export const useTransactionComposer = ({
  activePeriodId,
  userId,
  transactionCategories,
}) => {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: DEFAULT_TRANSACTION_DRAFT,
  });

  const createTransaction = useMutation({
    mutationFn: async (draft) => {
      if (!activePeriodId || !userId) {
        throw new Error("Periodo e usuario sao obrigatorios.");
      }

      const amountNumber = Number(draft.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor valido.");
      }

      const category = await ensureTransactionCategory({
        categoryId: draft.categoryId,
        categoryName: draft.categoryName,
        transactionCategories,
        queryClient,
      });

      const basePayload = {
        description: draft.description,
        amount: amountNumber,
        type: draft.type,
        periodId: activePeriodId,
        responsibleUserId: draft.responsibleUserId || null,
        category,
      };

      if (!draft.isRecurring) {
        return transactionService.create(basePayload);
      }

      const periodsNumber = Number(draft.numberOfPeriods);
      if (Number.isNaN(periodsNumber) || periodsNumber < 2) {
        throw new Error("Informe pelo menos 2 periodos para recorrencia.");
      }

      return transactionService.createRecurring({
        transaction: basePayload,
        numberOfPeriods: periodsNumber,
      });
    },
    onSuccess: async () => {
      form.reset(DEFAULT_TRANSACTION_DRAFT);
      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodTransactions(activePeriodId),
      });
    },
  });

  return {
    form,
    canCreate: Boolean(activePeriodId && userId),
    submitCreate: form.handleSubmit((values) => createTransaction.mutate(values)),
    createTransaction,
    createTransactionError: useMemo(
      () =>
        getProblemDetailMessage(
          createTransaction.error,
          "Nao foi possivel cadastrar a transacao."
        ),
      [createTransaction.error]
    ),
    createTransactionErrors: useMemo(
      () => getProblemDetailErrors(createTransaction.error),
      [createTransaction.error]
    ),
  };
};
