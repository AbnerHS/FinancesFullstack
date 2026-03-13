import { startTransition, useMemo, useOptimistic, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "../../../../services/transactionService";
import { transactionsQueryKeys } from "../utils/queryKeys";

const getResponsibleGroupId = (transaction) =>
  transaction?.responsibleUserId || "__unassigned__";

const replaceTransactionsInEntries = (currentEntries, nextTransactions) => {
  const invoices = currentEntries.filter((entry) => entry.kind !== "TRANSACTION");
  return [...nextTransactions, ...invoices];
};

const reorderTransactions = (transactions, fromIndex, toIndex) => {
  if (fromIndex === toIndex) {
    return transactions;
  }

  const next = [...transactions];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const reorderGroupedTransactions = (transactions, draggedId, targetId) => {
  const draggedEntry = transactions.find((transaction) => transaction.id === draggedId);
  const targetEntry = transactions.find((transaction) => transaction.id === targetId);

  if (!draggedEntry || !targetEntry) {
    return null;
  }

  const draggedGroupId = getResponsibleGroupId(draggedEntry);
  const targetGroupId = getResponsibleGroupId(targetEntry);

  if (draggedGroupId !== targetGroupId) {
    return null;
  }

  const groupTransactions = transactions.filter(
    (entry) => getResponsibleGroupId(entry) === draggedGroupId
  );

  const fromIndex = groupTransactions.findIndex((transaction) => transaction.id === draggedId);
  const toIndex = groupTransactions.findIndex((transaction) => transaction.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return null;
  }

  const reorderedGroup = reorderTransactions(groupTransactions, fromIndex, toIndex);
  let replacementIndex = 0;

  return transactions.map((entry) => {
    if (getResponsibleGroupId(entry) !== draggedGroupId) {
      return entry;
    }

    const nextEntry = reorderedGroup[replacementIndex];
    replacementIndex += 1;
    return nextEntry;
  });
};

export const useTransactionReorder = ({
  activePeriodId,
  entries,
  groupByResponsible = true,
}) => {
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [optimisticEntries, setOptimisticEntries] = useOptimistic(
    entries,
    (currentEntries, nextTransactions) =>
      replaceTransactionsInEntries(currentEntries, nextTransactions)
  );

  const reorderMutation = useMutation({
    mutationFn: async (orderedTransactions) => {
      if (!Array.isArray(orderedTransactions) || orderedTransactions.length === 0) {
        return [];
      }

      const updates = orderedTransactions.map((entry, index) => ({
        id: entry.id,
        order: index + 1,
        current: entry.order ?? null,
      }));

      const changed = updates.filter((item) => item.order !== item.current);
      if (changed.length === 0) {
        return [];
      }

      await Promise.all(
        changed.map((item) =>
          transactionService.updatePartial(item.id, { order: item.order })
        )
      );

      return changed;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodTransactions(activePeriodId),
      });
    },
    onError: async () => {
      await queryClient.invalidateQueries({
        queryKey: transactionsQueryKeys.periodTransactions(activePeriodId),
      });
    },
  });

  const transactionEntries = useMemo(
    () => optimisticEntries.filter((entry) => entry.kind === "TRANSACTION"),
    [optimisticEntries]
  );

  const endDrag = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const startDrag = (entry, event) => {
    if (reorderMutation.isPending) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entry.id);
    setDraggingId(entry.id);
  };

  const dragOver = (entry, event) => {
    if (reorderMutation.isPending) {
      return;
    }

    event.preventDefault();
    if (entry?.id) {
      setDragOverId(entry.id);
    }
  };

  const dropOnEntry = (entry, event) => {
    if (reorderMutation.isPending) {
      return;
    }

    event.preventDefault();

    const draggedId = draggingId || event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === entry.id) {
      setDragOverId(null);
      return;
    }

    const nextTransactions = (() => {
      if (groupByResponsible) {
        return reorderGroupedTransactions(transactionEntries, draggedId, entry.id);
      }

      const fromIndex = transactionEntries.findIndex((transaction) => transaction.id === draggedId);
      const toIndex = transactionEntries.findIndex((transaction) => transaction.id === entry.id);

      if (fromIndex < 0 || toIndex < 0) {
        return null;
      }

      return reorderTransactions(transactionEntries, fromIndex, toIndex);
    })();

    if (!nextTransactions) {
      endDrag();
      return;
    }

    startTransition(() => {
      setOptimisticEntries(nextTransactions);
    });
    setDragOverId(null);
    setDraggingId(null);
    reorderMutation.mutate(nextTransactions);
  };

  return {
    entries: optimisticEntries,
    draggingId,
    dragOverId,
    reorderPending: reorderMutation.isPending,
    startDrag,
    endDrag,
    dragOver,
    dropOnEntry,
  };
};
