import { startTransition, useMemo, useOptimistic, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { financeKeys, transactionService } from "@/features/finance/services.ts"
import type { ResponsibleOption, Transaction } from "@/features/finance/types.ts"

const UNASSIGNED_GROUP_ID = "__unassigned__"

export function getResponsibleGroupId(transaction: Transaction) {
  return transaction.responsibleUserId || UNASSIGNED_GROUP_ID
}

function replaceTransactions(currentTransactions: Transaction[], nextTransactions: Transaction[]) {
  const replacementMap = new Map(nextTransactions.map((transaction) => [transaction.id, transaction]))

  return currentTransactions.map((transaction) => {
    const replacement = replacementMap.get(transaction.id)
    return replacement ?? transaction
  })
}

function reorderTransactions(transactions: Transaction[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return transactions
  }

  const next = [...transactions]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function reorderGroupedTransactions(
  transactions: Transaction[],
  draggedId: string,
  targetId: string
) {
  const draggedEntry = transactions.find((transaction) => transaction.id === draggedId)
  const targetEntry = transactions.find((transaction) => transaction.id === targetId)

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
  const fromIndex = groupTransactions.findIndex((transaction) => transaction.id === draggedId)
  const toIndex = groupTransactions.findIndex((transaction) => transaction.id === targetId)

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return null
  }

  const reorderedGroup = reorderTransactions(groupTransactions, fromIndex, toIndex).map(
    (transaction, index) => ({
      ...transaction,
      order: index + 1,
    })
  )

  let replacementIndex = 0

  return transactions.map((entry) => {
    if (getResponsibleGroupId(entry) !== draggedGroupId) {
      return entry
    }

    const nextEntry = reorderedGroup[replacementIndex]
    replacementIndex += 1
    return nextEntry
  })
}

export function buildTransactionGroups(
  transactions: Transaction[],
  responsibleOptions: ResponsibleOption[]
) {
  const grouped = new Map<string, Transaction[]>()

  const orderedTransactions = [...transactions].sort((a, b) => {
    const left = a.order ?? Number.MAX_SAFE_INTEGER
    const right = b.order ?? Number.MAX_SAFE_INTEGER
    if (left !== right) {
      return left - right
    }

    return a.description.localeCompare(b.description, "pt-BR")
  })

  orderedTransactions.forEach((transaction) => {
    const groupId = getResponsibleGroupId(transaction)
    const current = grouped.get(groupId) ?? []
    current.push(transaction)
    grouped.set(groupId, current)
  })

  const knownResponsibleIds = new Set(responsibleOptions.map((option) => option.id))
  const orderedGroupIds = [
    ...responsibleOptions.map((option) => option.id),
    ...Array.from(grouped.keys()).filter(
      (groupId) => groupId !== UNASSIGNED_GROUP_ID && !knownResponsibleIds.has(groupId)
    ),
    UNASSIGNED_GROUP_ID,
  ].filter((groupId, index, all) => grouped.has(groupId) && all.indexOf(groupId) === index)

  return orderedGroupIds.map((groupId) => ({
    id: groupId,
    label:
      groupId === UNASSIGNED_GROUP_ID
        ? "Geral"
        : responsibleOptions.find((option) => option.id === groupId)?.label || "Responsável",
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
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [optimisticTransactions, setOptimisticTransactions] = useOptimistic(
    transactions,
    replaceTransactions
  )

  const reorderMutation = useMutation({
    mutationFn: async (orderedTransactions: Transaction[]) => {
      const updates = orderedTransactions.map((entry, index) => ({
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
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: financeKeys.periodTransactions(activePeriodId),
      })
    },
  })

  const orderedTransactions = useMemo(
    () =>
      [...optimisticTransactions].sort((a, b) => {
        const left = a.order ?? Number.MAX_SAFE_INTEGER
        const right = b.order ?? Number.MAX_SAFE_INTEGER
        if (left !== right) {
          return left - right
        }

        return a.description.localeCompare(b.description, "pt-BR")
      }),
    [optimisticTransactions]
  )

  const endDrag = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  return {
    transactions: orderedTransactions,
    draggingId,
    dragOverId,
    reorderPending: reorderMutation.isPending,
    startDrag: (entry: Transaction, event: React.DragEvent<HTMLElement>) => {
      if (reorderMutation.isPending) {
        return
      }

      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", entry.id)
      setDraggingId(entry.id)
    },
    endDrag,
    dragOver: (entry: Transaction, event: React.DragEvent<HTMLElement>) => {
      if (reorderMutation.isPending) {
        return
      }

      event.preventDefault()
      setDragOverId(entry.id)
    },
    dropOnEntry: (entry: Transaction, event: React.DragEvent<HTMLElement>) => {
      if (reorderMutation.isPending) {
        return
      }

      event.preventDefault()
      const draggedId = draggingId || event.dataTransfer.getData("text/plain")
      if (!draggedId || draggedId === entry.id) {
        endDrag()
        return
      }

      const nextTransactions = reorderGroupedTransactions(
        orderedTransactions,
        draggedId,
        entry.id
      )

      if (!nextTransactions) {
        endDrag()
        return
      }

      startTransition(() => {
        setOptimisticTransactions(nextTransactions)
      })

      endDrag()
      reorderMutation.mutate(nextTransactions)
    },
  }
}
