import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GripVertical,
  Pencil,
  Plus,
  Save,
  SendHorizonal,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { createPortal } from "react-dom"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import {
  ConfirmationDialog,
  type ConfirmationDialogState,
} from "@/components/ui/confirmation-dialog.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import {
  usePeriodInvoiceManager,
  useTransactionLinking,
  useTransactionMutations,
} from "@/features/finance/hooks.ts"
import { TransactionComposer } from "@/features/finance/transaction-composer.tsx"
import {
  buildTransactionGroups,
  useTransactionReorder,
} from "@/features/finance/transaction-workspace-utils.ts"
import type {
  CreditCard,
  Invoice,
  PaymentStatus,
  Period,
  ResponsibleOption,
  Transaction,
  TransactionCategory,
  TransactionFormValues,
} from "@/features/finance/types.ts"
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  getTransactionDueAlert,
  parseCurrencyInput,
  toneForBalance,
} from "@/features/finance/utils.ts"
import { getErrorMessage } from "@/lib/errors.ts"
import MetricCard from "./metric-card"

type TransactionWorkspaceProps = {
  panel: {
    period: Period
    label: string
    transactions: Transaction[]
    invoices: Invoice[]
    stats: { incomes: number; expenses: number; balance: number }
    transactionsLoading: boolean
    invoicesLoading: boolean
  }
  shared: {
    creditCards: CreditCard[]
    periods: Period[]
    transactionCategories: TransactionCategory[]
    responsibleOptions: ResponsibleOption[]
  }
}

type TransactionRowProps = {
  transaction: Transaction
  isDragOver: boolean
  reorderPending: boolean
  onOpenDetails: (transaction: Transaction) => void
  onLink: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

const emptyForm = (periodId: string): TransactionFormValues => ({
  description: "",
  amount: "",
  type: "EXPENSE",
  periodId,
  responsibleUserId: "",
  categoryId: "",
  categoryName: "",
  isRecurring: false,
  numberOfPeriods: 2,
  recurringGroupId: null,
  hasDueDate: false,
  dueDate: "",
  isPaid: false,
  paymentDate: "",
})

function TransactionRowContent({
  transaction,
  dragHandle,
  onOpenDetails,
  onLink,
  onEdit,
  onDelete,
}: {
  transaction: Transaction
  dragHandle: React.ReactNode
  onOpenDetails?: (transaction: Transaction) => void
  onLink?: (transaction: Transaction) => void
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}) {
  const dueAlert = getTransactionDueAlert(transaction)
  const dueAlertBadge =
    dueAlert === "overdue"
      ? {
        label: "Vencida",
        className:
          "border-amber-500/50 bg-amber-500/12 text-amber-700 dark:text-amber-300",
      }
      : dueAlert === "dueSoon"
        ? {
          label: "Vence em breve",
          className:
            "border-orange-500/40 bg-orange-500/12 text-orange-700 dark:text-orange-300",
        }
        : null

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
            <button
              type="button"
              className="max-w-full cursor-pointer truncate text-left font-semibold text-foreground transition hover:text-primary"
              onClick={
                onOpenDetails
                  ? () => onOpenDetails(transaction)
                  : undefined
              }
            >
              {transaction.description}
            </button>
            <span className="flex items-center gap-1">

              {transaction.recurringGroupId ? (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">
                  Recorrente
                </span>
              ) : null}
              {dueAlertBadge ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${dueAlertBadge.className}`}
                >
                  {dueAlertBadge.label}
                </span>
              ) : null}
              {transaction.type === "EXPENSE" &&
                transaction.paymentStatus !== "PAID" &&
                transaction.dueDate ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                  <Clock3 size={12} />
                  {`Vence ${formatDateOnly(transaction.dueDate)}`}
                </span>
              ) : null}
              {transaction.type === "EXPENSE" &&
                transaction.paymentStatus === "PAID" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  Pago
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
        <span
          className={`text-sm font-semibold ${transaction.type === "REVENUE"
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-rose-500 dark:text-rose-400"
            }`}
        >
          {formatCurrency(transaction.amount)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={
            transaction.type === "EXPENSE" && transaction.isClearedByInvoice
              ? "text-emerald-500 dark:text-emerald-400"
              : undefined
          }
          onClick={onLink ? () => onLink(transaction) : undefined}
          disabled={!onLink || transaction.type !== "EXPENSE"}
        >
          <CheckCircle2 size={14} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit ? () => onEdit(transaction) : undefined}
          disabled={!onEdit}
        >
          <Pencil size={14} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete ? () => onDelete(transaction) : undefined}
          disabled={!onDelete}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </>
  )
}

function TransactionDragHandle({
  listeners,
  attributes,
  setActivatorNodeRef,
  disabled,
}: {
  listeners?: DraggableSyntheticListeners
  attributes?: DraggableAttributes
  setActivatorNodeRef?: (element: HTMLElement | null) => void
  disabled?: boolean
}) {
  return (
    <button
      ref={setActivatorNodeRef}
      type="button"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-secondary/80 text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      style={{ touchAction: "none" }}
      aria-label="Arrastar transação"
      disabled={disabled}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={14} />
    </button>
  )
}

function SortableTransactionRow({
  transaction,
  isDragOver,
  reorderPending,
  onOpenDetails,
  onLink,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: transaction.id,
    disabled: reorderPending,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      className={`flex flex-col gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${isDragging
        ? "z-10 border-primary/45 opacity-70 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
        : getTransactionDueAlert(transaction) === "overdue"
          ? "border-amber-500/60 bg-amber-500/[0.05] shadow-[0_14px_30px_rgba(245,158,11,0.10)]"
          : getTransactionDueAlert(transaction) === "dueSoon"
            ? "border-orange-400/50 bg-orange-500/[0.04]"
            : isDragOver
              ? "border-primary ring-2 ring-primary/15"
              : "border-border"
        }`}
    >
      <TransactionRowContent
        transaction={transaction}
        dragHandle={
          <TransactionDragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            disabled={reorderPending}
          />
        }
        onOpenDetails={onOpenDetails}
        onLink={onLink}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

function TransactionDetailsModal({
  transaction,
  periodLabel,
  responsibleOptions,
  onClose,
}: {
  transaction: Transaction | null
  periodLabel: string
  responsibleOptions: ResponsibleOption[]
  onClose: () => void
}) {
  if (!transaction) {
    return null
  }

  const responsibleLabel =
    responsibleOptions.find(
      (option) => option.id === transaction.responsibleUserId
    )?.label ?? "Geral"

  const details = [
    { label: "Período", value: periodLabel },
    { label: "Tipo", value: transaction.type === "REVENUE" ? "Receita" : "Despesa" },
    {
      label: "Categoria",
      value: transaction.category?.name || "Sem categoria",
    },
    { label: "Responsável", value: responsibleLabel },
    {
      label: "Vencimento",
      value: transaction.dueDate ? formatDateOnly(transaction.dueDate) : "Não informado",
    },
    {
      label: "Status do pagamento",
      value:
        transaction.type === "EXPENSE"
          ? transaction.paymentStatus === "PAID"
            ? "Pago"
            : "Pendente"
          : "Não se aplica",
    },
    {
      label: "Data de pagamento",
      value: transaction.paymentDate
        ? formatDateOnly(transaction.paymentDate)
        : "Não informado",
    },
    {
      label: "Lançamento",
      value: transaction.dateTime
        ? formatDateTime(transaction.dateTime)
        : "Não informado",
    },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="grid max-h-[90vh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
          <div>
            <p className="app-eyebrow">Detalhes da transação</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">
              {transaction.description}
            </h3>
            <p className="mt-2 text-sm font-semibold text-primary">
              {formatCurrency(transaction.amount)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="rounded-xl border border-border/70 bg-secondary/40 px-4 py-3"
              >
                <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {detail.label}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {detail.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-border/70 px-4 py-4 sm:px-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function TransactionsWorkspace({
  panel,
  shared,
}: TransactionWorkspaceProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [form, setForm] = useState<TransactionFormValues>(() =>
    emptyForm(panel.period.id)
  )
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const [detailsTransaction, setDetailsTransaction] =
    useState<Transaction | null>(null)
  const [editingScope, setEditingScope] = useState<"SINGLE" | "GROUP">("SINGLE")
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)

  const {
    createTransaction,
    createRecurringTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactionMutations(panel.period.id, shared.periods)
  const transactionLinking = useTransactionLinking(panel.period.id)
  const invoiceManager = usePeriodInvoiceManager({
    creditCards: shared.creditCards,
    invoices: panel.invoices,
    periodId: panel.period.id,
  })

  const reorder = useTransactionReorder({
    activePeriodId: panel.period.id,
    transactions: panel.transactions,
  })

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    })
  )

  const groupedTransactions = useMemo(
    () =>
      buildTransactionGroups(reorder.transactions, shared.responsibleOptions),
    [reorder.transactions, shared.responsibleOptions]
  )
  const categoryOptions = useMemo(
    () =>
      shared.transactionCategories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    [shared.transactionCategories]
  )

  const mutationError = useMemo(() => {
    if (createTransaction.error) {
      return getErrorMessage(
        createTransaction.error,
        "Não foi possível salvar a transação."
      )
    }
    if (createRecurringTransaction.error) {
      return getErrorMessage(
        createRecurringTransaction.error,
        "Não foi possível criar a recorrência."
      )
    }
    if (updateTransaction.error) {
      return getErrorMessage(
        updateTransaction.error,
        "Não foi possível atualizar a transação."
      )
    }
    if (deleteTransaction.error) {
      return getErrorMessage(
        deleteTransaction.error,
        "Não foi possível remover a transação."
      )
    }
    return null
  }, [
    createRecurringTransaction.error,
    createTransaction.error,
    deleteTransaction.error,
    updateTransaction.error,
  ])

  const resetComposer = () => {
    setEditingTransaction(null)
    setEditingScope("SINGLE")
    setFormError(null)
    setForm(emptyForm(panel.period.id))
  }

  const startCreateTransaction = () => {
    resetComposer()
    setIsComposerOpen(true)
  }

  const startEditing = (transaction: Transaction) => {
    setIsComposerOpen(true)
    setEditingTransaction(transaction)
    setEditingScope("SINGLE")
    setForm({
      description: transaction.description,
      amount: String(
        Number(transaction.amount || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      ),
      type: transaction.type,
      periodId: panel.period.id,
      responsibleUserId: transaction.responsibleUserId || "",
      categoryId: transaction.category?.id || "",
      categoryName: transaction.category?.name || "",
      isRecurring: false,
      numberOfPeriods: 2,
      recurringGroupId: transaction.recurringGroupId || null,
      hasDueDate: Boolean(
        transaction.dueDate ||
        transaction.paymentDate ||
        transaction.paymentStatus === "PAID"
      ),
      dueDate: transaction.dueDate || "",
      isPaid: transaction.paymentStatus === "PAID",
      paymentDate: transaction.paymentDate || "",
    })
  }

  const submit = async () => {
    setFormError(null)
    const amount = parseCurrencyInput(form.amount)
    if (!form.description.trim()) {
      throw new Error("Informe a descrição.")
    }
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error("Informe um valor válido.")
    }

    if (form.type === "EXPENSE" && form.hasDueDate && !form.dueDate) {
      throw new Error("Informe a data de vencimento.")
    }

    const categoryName = form.categoryName.trim()
    const payload: {
      description: string
      amount: number
      type: Transaction["type"]
      periodId: string
      responsibleUserId: string | null
      category: { id?: string; name?: string } | null
      dueDate?: string | null
      paymentDate?: string | null
      paymentStatus?: PaymentStatus | null
    } = {
      description: form.description.trim(),
      amount,
      type: form.type,
      periodId: panel.period.id,
      responsibleUserId: form.responsibleUserId || null,
      category: categoryName
        ? form.categoryId
          ? { id: form.categoryId }
          : { name: categoryName }
        : null,
    }

    if (form.type === "EXPENSE") {
      if (form.hasDueDate && form.dueDate) {
        payload.dueDate = form.dueDate
        payload.paymentStatus = form.isPaid ? "PAID" : "PENDING"
        payload.paymentDate =
          form.isPaid && form.paymentDate ? form.paymentDate : null
      } else {
        payload.dueDate = null
        payload.paymentDate = null
        payload.paymentStatus = "PENDING"
      }
    } else {
      payload.dueDate = null
      payload.paymentDate = null
      payload.paymentStatus = null
    }

    if (editingTransaction?.id) {
      const updatePayload: Record<string, unknown> = { ...payload }
      if (editingScope === "GROUP" && editingTransaction.recurringGroupId) {
        updatePayload.recurringGroupId = editingTransaction.recurringGroupId
        updatePayload.editScope = "GROUP"
      }

      await updateTransaction.mutateAsync({
        id: editingTransaction.id,
        payload: updatePayload,
      })
    } else if (form.isRecurring) {
      if (!Number.isFinite(form.numberOfPeriods) || form.numberOfPeriods < 2) {
        throw new Error("Informe pelo menos 2 períodos para recorrência.")
      }

      await createRecurringTransaction.mutateAsync({
        transaction: payload,
        numberOfPeriods: Number(form.numberOfPeriods),
      })
    } else {
      await createTransaction.mutateAsync(payload)
    }

    resetComposer()
    setIsComposerOpen(false)
  }

  return (
    <Card className="border-border bg-card/90 p-4 shadow-[0_22px_54px_rgba(15,23,42,0.10)] backdrop-blur-xl xl:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
        <div>
          <p className="app-eyebrow text-[13px] font-bold text-primary">
            {panel.label}
          </p>
          {!isComposerOpen ? (
            <div className="mt-2">
              <Button
                type="button"
                className="w-full xl:w-auto"
                onClick={startCreateTransaction}
              >
                Nova Transação
                <Plus size={16} />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="grid items-end gap-2 xl:grid-cols-3">
          <MetricCard
            title="Receitas"
            value={formatCurrency(panel.stats.incomes)}
            tone="positive"
            icon={<TrendingUp size={18} />}
            size="sm"
          />
          <MetricCard
            title="Despesas"
            value={formatCurrency(panel.stats.expenses)}
            tone="negative"
            icon={<TrendingDown size={18} />}
            size="sm"
          />
          <MetricCard
            title="Saldo"
            value={formatCurrency(panel.stats.balance)}
            tone={toneForBalance(panel.stats.balance)}
            icon={<ArrowRight size={18} />}
            size="sm"
          />
        </div>
      </div>

      <div className="mt-6 space-y-5">

        <div>
          <TransactionComposer
            isOpen={isComposerOpen}
            periodLabel={panel.label}
            form={form}
            setForm={setForm}
            editingTransaction={editingTransaction}
            showCancel={Boolean(editingTransaction || isComposerOpen)}
            editingScope={editingScope}
            setEditingScope={setEditingScope}
            categoryOptions={categoryOptions}
            responsibleOptions={shared.responsibleOptions}
            formError={formError}
            mutationError={mutationError}
            createPending={createTransaction.isPending}
            createRecurringPending={createRecurringTransaction.isPending}
            updatePending={updateTransaction.isPending}
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await submit()
              } catch (error) {
                setFormError(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível salvar a transação."
                )
              }
            }}
            onCancel={() => {
              resetComposer()
              setIsComposerOpen(false)
            }}
          />
        </div>

        <Card className="border-border bg-secondary/40 p-3 sm:p-4">
          <h4 className="app-eyebrow">Transações por responsável</h4>
          <div className="mt-3 space-y-4">
            {panel.transactionsLoading ? (
              <p className="text-sm text-muted-foreground">
                Carregando transações...
              </p>
            ) : groupedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma transação cadastrada.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragStart={reorder.onDragStart}
                onDragOver={reorder.onDragOver}
                onDragCancel={reorder.onDragCancel}
                onDragEnd={reorder.onDragEnd}
              >
                {groupedTransactions.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
                      <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                        {group.label}
                      </p>
                    </div>

                    <SortableContext
                      items={group.transactions.map(
                        (transaction) => transaction.id
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {group.transactions.map((transaction) => (
                        <SortableTransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          isDragOver={
                            reorder.overId === transaction.id &&
                            reorder.activeId !== transaction.id
                          }
                          reorderPending={reorder.reorderPending}
                          onOpenDetails={(entry) =>
                            setDetailsTransaction(entry)
                          }
                          onLink={(entry) =>
                            transactionLinking.openPaymentModal(entry)
                          }
                          onEdit={startEditing}
                          onDelete={(entry) =>
                            setConfirmationDialog({
                              confirmLabel: "Excluir Transação",
                              description: `A transação "${entry.description}" será removida deste mês.`,
                              title: "Excluir transação?",
                              onConfirm: () =>
                                deleteTransaction.mutate(entry.id),
                              ...(entry.recurringGroupId
                                ? {
                                  confirmLabel: "Excluir somente esta",
                                  description: `A transação "${entry.description}" faz parte de uma recorrência. Você pode remover apenas este mês ou excluir todas as recorrências do grupo.`,
                                  title: "Excluir transação recorrente?",
                                  secondaryConfirmLabel: "Excluir todas",
                                  onSecondaryConfirm: () =>
                                    deleteTransaction.mutate({
                                      id: entry.id,
                                      recurringGroupId:
                                        entry.recurringGroupId,
                                      deleteScope: "GROUP",
                                    }),
                                }
                                : {}),
                            })
                          }
                        />
                      ))}
                    </SortableContext>
                  </div>
                ))}
              </DndContext>
            )}
          </div>
        </Card>
        <ConfirmationDialog
          onClose={() => setConfirmationDialog(null)}
          state={confirmationDialog}
        />
        <TransactionDetailsModal
          transaction={detailsTransaction}
          periodLabel={panel.label}
          responsibleOptions={shared.responsibleOptions}
          onClose={() => setDetailsTransaction(null)}
        />

        <Card className="border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="app-eyebrow">Faturas</h4>
            {panel.invoices.length > 0 && !invoiceManager.isCreateOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={invoiceManager.startCreate}
              >
                Nova Fatura
                <Plus size={14} />
              </Button>
            ) : null}
          </div>
          {invoiceManager.isCreateOpen ? (
            <div className="mt-3 rounded-xl border border-border bg-card/90 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div>
                  <Label>Cartão</Label>
                  <Select
                    value={invoiceManager.createForm.creditCardId}
                    onChange={(event) =>
                      invoiceManager.setCreateForm((current) => ({
                        ...current,
                        creditCardId: event.target.value,
                      }))
                    }
                  >
                    {shared.creditCards.length === 0 ? (
                      <option value="">Sem cartões</option>
                    ) : null}
                    {shared.creditCards.length > 0 ? (
                      <option value="">Selecione o cartão</option>
                    ) : null}
                    {shared.creditCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <CurrencyInput
                    value={invoiceManager.createForm.amount}
                    onValueChange={(amount) =>
                      invoiceManager.setCreateForm((current) => ({
                        ...current,
                        amount,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    className="h-11"
                    onClick={() => invoiceManager.createInvoice.mutate()}
                    disabled={invoiceManager.createInvoice.isPending}
                  >
                    {invoiceManager.createInvoice.isPending
                      ? "Enviando..."
                      : "Enviar"}
                    <SendHorizonal size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={invoiceManager.cancelCreate}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <FormError message={invoiceManager.createErrorMessage} />
              </div>
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {panel.invoicesLoading ? (
              <p className="text-sm text-muted-foreground">
                Carregando faturas...
              </p>
            ) : panel.invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Nenhuma fatura registrada.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={invoiceManager.startCreate}
                >
                  Criar fatura neste mês
                  <Plus size={14} />
                </Button>
              </div>
            ) : (
              panel.invoices.map((invoice) => {
                const card = shared.creditCards.find(
                  (item) => item.id === invoice.creditCardId
                )
                const cardLabel =
                  invoice.creditCardName || card?.name || "Cartão"
                const isEditing = invoiceManager.editingInvoiceId === invoice.id

                return (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-border bg-card/90 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {cardLabel}
                        </p>
                      </div>
                      {isEditing ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <div className="w-full min-w-40 sm:w-44">
                            <CurrencyInput
                              value={invoiceManager.editingAmount}
                              onValueChange={invoiceManager.setEditingAmount}
                            />
                          </div>
                          <Button
                            type="button"
                            className="h-11"
                            onClick={() =>
                              invoiceManager.updateInvoice.mutate()
                            }
                            disabled={invoiceManager.updateInvoice.isPending}
                          >
                            {invoiceManager.updateInvoice.isPending
                              ? "Salvando..."
                              : "Salvar"}
                            <Save size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11"
                            onClick={invoiceManager.cancelEdit}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                            {formatCurrency(invoice.amount)}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => invoiceManager.startEdit(invoice)}
                          >
                            <Pencil size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-3">
                        <FormError
                          message={invoiceManager.updateErrorMessage}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {transactionLinking.paymentModalEntry ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="grid max-h-[90vh] w-full max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
              <div className="border-b border-border/70 px-4 py-4 sm:px-5">
                <p className="app-eyebrow">Fatura</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">
                  Vincular transação
                </h3>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {transactionLinking.paymentModalEntry.description}
                </p>
              </div>

              <div className="overflow-y-auto px-4 py-4 sm:px-5">
                <div className="space-y-2">
                  <Label>Fatura</Label>
                  <Select
                    value={transactionLinking.selectedInvoiceId}
                    onChange={(event) =>
                      transactionLinking.setSelectedInvoiceId(event.target.value)
                    }
                  >
                    <option value="">Selecione a fatura</option>
                    {panel.invoices.map((invoice) => {
                      const card = shared.creditCards.find(
                        (creditCard) => creditCard.id === invoice.creditCardId
                      )

                      return (
                        <option key={invoice.id} value={invoice.id}>
                          {card?.name || "Fatura"} -{" "}
                          {formatCurrency(invoice.amount)}
                        </option>
                      )
                    })}
                  </Select>
                </div>

                {transactionLinking.linkTransactionError ? (
                  <p className="mt-3 text-xs text-rose-500 dark:text-rose-400">
                    {transactionLinking.linkTransactionError}
                  </p>
                ) : null}

                {panel.invoices.length === 0 ? (
                  <p className="mt-3 text-xs text-amber-500 dark:text-amber-400">
                    Nenhuma fatura disponível.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-4 py-4 sm:px-5">
                {transactionLinking.paymentModalEntry.isClearedByInvoice ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-amber-500 dark:text-amber-400"
                    onClick={() => {
                      transactionLinking.unlinkTransactionFromInvoice.mutate(
                        transactionLinking.paymentModalEntry!.id
                      )
                      transactionLinking.closePaymentModal()
                    }}
                    disabled={
                      transactionLinking.unlinkTransactionFromInvoice.isPending
                    }
                  >
                    {transactionLinking.unlinkTransactionFromInvoice.isPending
                      ? "Desvinculando..."
                      : "Desvincular"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={transactionLinking.closePaymentModal}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    transactionLinking.linkTransactionToInvoice.mutate()
                  }
                  disabled={
                    transactionLinking.linkTransactionToInvoice.isPending ||
                    panel.invoices.length === 0
                  }
                >
                  {transactionLinking.linkTransactionToInvoice.isPending
                    ? "Vinculando..."
                    : "Vincular"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
