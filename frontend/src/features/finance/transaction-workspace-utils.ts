import { useMemo, useOptimistic, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core"

import { financeKeys, transactionService } from "@/features/finance/services.ts"
import type { ResponsibleOption, Transaction } from "@/features/finance/types.ts"

const UNASSIGNED_GROUP_ID = "__unassigned__"

export function getResponsibleGroupId(transaction: Transaction) {
  return transaction.responsibleUserId || UNASSIGNED_GROUP_ID
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((a, b) => {
    const left = a.order ?? Number.MAX_SAFE_INTEGER
    const right = b.order ?? Number.MAX_SAFE_INTEGER
    if (left !== right) {
      return left - right
    }

    return a.description.localeCompare(b.description, "pt-BR")
  })
}

function replaceTransactions(
  currentTransactions: Transaction[],
  nextTransactions: Transaction[]
) {
  const replacementMap = new Map(
    nextTransactions.map((transaction) => [transaction.id, transaction])
  )

  return currentTransactions.map((transaction) => {
    const replacement = replacementMap.get(transaction.id)
    return replacement ?? transaction
  })
}

function reorderTransactions(
  transactions: Transaction[],
  fromIndex: number,
  toIndex: number
) {
  if (fromIndex === toIndex) {
    return transactions
  }

  const next = [...transactions]
  const [moved] = next.splice(fromIndex, 1)

  if (!moved) {
    return transactions
  }

  next.splice(toIndex, 0, moved)
  return next
}

export function reorderGroupedTransactions(
  transactions: Transaction[],
  draggedId: string,
  targetId: string
) {
  const draggedEntry = transactions.find(
    (transaction) => transaction.id === draggedId
  )
  const targetEntry = transactions.find(
    (transaction) => transaction.id === targetId
  )

  if (!draggedEntry || !targetEntry) {
    return null
  }

  const draggedGroupId = getResponsibleGroupId(draggedEntry)
  const targetGroupId = getResponsibleGroupId(targetEntry)

  if (draggedGroupId !== targetGroupId) {
    return null
  }

  const groupTransactions = transactions.filter(
    (entry) => getResponsibleGroupId(entry) === draggedGroupId
  )
  const fromIndex = groupTransactions.findIndex(
    (transaction) => transaction.id === draggedId
  )
  const toIndex = groupTransactions.findIndex(
    (transaction) => transaction.id === targetId
  )

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return null
  }

  const reorderedGroup = reorderTransactions(
    groupTransactions,
    fromIndex,
    toIndex
  ).map((transaction, index) => ({
    ...transaction,
    order: index + 1,
  }))

  let replacementIndex = 0

  return transactions.map((entry) => {
    if (getResponsibleGroupId(entry) !== draggedGroupId) {
      return entry
    }

    const nextEntry = reorderedGroup[replacementIndex]
    replacementIndex += 1
    return nextEntry ?? entry
  })
}

function getTransactionId(identifier: UniqueIdentifier | null | undefined) {
  return typeof identifier === "string" ? identifier : null
}

export function buildTransactionGroups(
  transactions: Transaction[],
  responsibleOptions: ResponsibleOption[]
) {
  const grouped = new Map<string, Transaction[]>()

  sortTransactions(transactions).forEach((transaction) => {
    const groupId = getResponsibleGroupId(transaction)
    const current = grouped.get(groupId) ?? []
    current.push(transaction)
    grouped.set(groupId, current)
  })

  const knownResponsibleIds = new Set(
    responsibleOptions.map((option) => option.id)
  )
  const orderedGroupIds = [
    ...responsibleOptions.map((option) => option.id),
    ...Array.from(grouped.keys()).filter(
      (groupId) =>
        groupId !== UNASSIGNED_GROUP_ID && !knownResponsibleIds.has(groupId)
    ),
    UNASSIGNED_GROUP_ID,
  ].filter(
    (groupId, index, all) =>
      grouped.has(groupId) && all.indexOf(groupId) === index
  )

  return orderedGroupIds.map((groupId) => ({
    id: groupId,
    label:
      groupId === UNASSIGNED_GROUP_ID
        ? "Geral"
        : responsibleOptions.find((option) => option.id === groupId)?.label ||
          "Responsável",
    transactions: grouped.get(groupId) ?? [],
  }))
}

export function useTransactionReorder({
  activePeriodId,
  transactions,
}: {
  activePeriodId: string
  transactions: Transaction[]
}) {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [optimisticTransactions, setOptimisticTransactions] = useOptimistic(
    transactions,
    replaceTransactions
  )

  const orderedTransactions = useMemo(
    () => sortTransactions(optimisticTransactions),
    [optimisticTransactions]
  )
  const activeTransaction = useMemo(
    () =>
      activeId
        ? orderedTransactions.find((transaction) => transaction.id === activeId) ||
          null
        : null,
    [activeId, orderedTransactions]
  )

  const reorderMutation = useMutation({
    mutationFn: async (orderedNextTransactions: Transaction[]) => {
      const updates = orderedNextTransactions.map((entry, index) => ({
        id: entry.id,
        order: index + 1,
        current: entry.order ?? null,
      }))

      const changed = updates.filter((item) => item.order !== item.current)
      if (changed.length === 0) {
        return []
      }

      await Promise.all(
        changed.map((item) =>
          transactionService.updatePartial(item.id, {
            order: item.order,
          })
        )
      )

      return changed
    },
    onMutate: async (orderedNextTransactions) => {
      const queryKey = financeKeys.periodTransactions(activePeriodId)
      const previousTransactions =
        queryClient.getQueryData<Transaction[]>(queryKey) ?? transactions

      queryClient.setQueryData<Transaction[]>(queryKey, orderedNextTransactions)

      return {
        previousTransactions,
      }
    },
    onError: (_error, _orderedNextTransactions, context) => {
      const previousTransactions = context?.previousTransactions ?? transactions

      setOptimisticTransactions(previousTransactions)
      queryClient.setQueryData<Transaction[]>(
        financeKeys.periodTransactions(activePeriodId),
        previousTransactions
      )
    },
    onSuccess: (_result, orderedNextTransactions) => {
      queryClient.setQueryData<Transaction[]>(
        financeKeys.periodTransactions(activePeriodId),
        orderedNextTransactions
      )
    },
  })

  const resetDragState = () => {
    setActiveId(null)
    setOverId(null)
  }

  return {
    transactions: orderedTransactions,
    activeId,
    overId,
    activeTransaction,
    reorderPending: reorderMutation.isPending,
    onDragStart: (event: DragStartEvent) => {
      if (reorderMutation.isPending) {
        return
      }

      const nextActiveId = getTransactionId(event.active.id)
      setActiveId(nextActiveId)
      setOverId(nextActiveId)
    },
    onDragOver: (event: DragOverEvent) => {
      if (reorderMutation.isPending) {
        return
      }

      const nextActiveId = getTransactionId(event.active.id)
      const nextOverId = getTransactionId(event.over?.id)
      if (!nextActiveId || !nextOverId) {
        setOverId(null)
        return
      }

      const activeTransaction = orderedTransactions.find(
        (transaction) => transaction.id === nextActiveId
      )
      const overTransaction = orderedTransactions.find(
        (transaction) => transaction.id === nextOverId
      )

      if (!activeTransaction || !overTransaction) {
        setOverId(null)
        return
      }

      setOverId(
        getResponsibleGroupId(activeTransaction) ===
          getResponsibleGroupId(overTransaction)
          ? nextOverId
          : null
      )
    },
    onDragCancel: () => {
      resetDragState()
    },
    onDragEnd: (event: DragEndEvent) => {
      if (reorderMutation.isPending) {
        resetDragState()
        return
      }

      const draggedId = getTransactionId(event.active.id)
      const targetId = getTransactionId(event.over?.id)

      if (!draggedId || !targetId || draggedId === targetId) {
        resetDragState()
        return
      }

      const nextTransactions = reorderGroupedTransactions(
        orderedTransactions,
        draggedId,
        targetId
      )

      if (!nextTransactions) {
        resetDragState()
        return
      }

      setOptimisticTransactions(nextTransactions)
      resetDragState()
      reorderMutation.mutate(nextTransactions)
    },
  }
}
