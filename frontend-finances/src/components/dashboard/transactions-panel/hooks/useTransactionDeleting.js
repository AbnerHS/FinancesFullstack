import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "../../../../services/transactionService";
import { getProblemDetailMessage } from "../utils/errorUtils";
import { transactionsQueryKeys } from "../utils/queryKeys";

export const useTransactionDeleting = ({
  activePeriodId,
  editingId,
  onDeleteCurrentEdit,
}) => {
  const queryClient = useQueryClient();
  const [deleteTransactionErrorId, setDeleteTransactionErrorId] = useState(null);

  const deleteTransaction = useMutation({
    onMutate: (entry) => {
      setDeleteTransactionErrorId(entry?.id || null);
    },
    mutationFn: async (entry) => {
      if (!entry?.id) {
        throw new Error("Transacao invalida.");
      }

      const confirmed = window.confirm(
        `Deseja excluir a transacao "${entry.description || "sem descricao"}"?`
      );

      if (!confirmed) {
        return null;
      }

      await transactionService.delete(entry.id);
      return entry.id;
    },
    onSuccess: async (deletedId) => {
      if (!deletedId) {
        setDeleteTransactionErrorId(null);
        return;
      }

      if (editingId === deletedId) {
        onDeleteCurrentEdit?.();
      }

      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodTransactions(activePeriodId),
      });
      setDeleteTransactionErrorId(null);
    },
    onError: (_error, entry) => {
      setDeleteTransactionErrorId(entry?.id || null);
    },
  });

  return {
    mutate: (entry) => deleteTransaction.mutate(entry),
    isPending: deleteTransaction.isPending,
    errorId: deleteTransactionErrorId,
    errorMessage: useMemo(
      () =>
        deleteTransaction.isError
          ? getProblemDetailMessage(
              deleteTransaction.error,
              "Nao foi possivel excluir a transacao."
            )
          : null,
      [deleteTransaction.error, deleteTransaction.isError]
    ),
  };
};
