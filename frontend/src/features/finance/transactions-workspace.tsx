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
import { useQueryClient } from "@tanstack/react-query"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard as CreditCardIcon,
  Download,
  Eye,
  ExternalLink,
  GripVertical,
  Link,
  Pencil,
  Plus,
  Repeat2,
  Save,
  SendHorizonal,
  Trash2,
  X,
} from "lucide-react"
import { createPortal } from "react-dom"
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

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
import { getCategoryBadgeStyle } from "@/features/finance/category-colors.ts"
import {
  usePeriodInvoiceManager,
  useTransactionLinking,
  useTransactionMutations,
} from "@/features/finance/hooks.ts"
import { TransactionComposer } from "@/features/finance/transaction-composer.tsx"
import { financeKeys, transactionService } from "@/features/finance/services.ts"
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
  defaultReferenceDate,
  parseCurrencyInput,
  toneForBalance,
} from "@/features/finance/utils.ts"
import { getErrorMessage } from "@/lib/errors.ts"

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
    transactionCategories: TransactionCategory[]
    responsibleOptions: ResponsibleOption[]
  }
}

const emptyForm = (): TransactionFormValues => ({
  description: "",
  amount: "",
  type: "EXPENSE",
  responsibleUserId: "",
  categoryId: "",
  categoryName: "",
  isRecurring: false,
  occurrences: 2,
  recurringGroupId: null,
  hasDueDate: false,
  dueDate: "",
  isPaid: false,
  paymentDate: "",
  billingDocumentType: "NONE",
  billingDocumentUrl: "",
  billingDocumentFile: null,
  billingDocumentExisting: null,
})

type TransactionActions = {
  onOpenDetails: (transaction: Transaction) => void
  onLink: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

type TransactionRowProps = TransactionActions & {
  transaction: Transaction
  isDragOver: boolean
  reorderPending: boolean
  onShowActions: (transaction: Transaction) => void
}

const LONG_PRESS_MS = 450
const LONG_PRESS_TOLERANCE_PX = 10

/**
 * Toque longo (só touch) na linha: abre as ações. Cancela se o dedo se mover (rolagem ou swipe
 * do carrossel) e engole o clique que vem depois, para não abrir também os detalhes.
 */
function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<number | undefined>(undefined)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const cancel = () => {
    window.clearTimeout(timerRef.current)
    startRef.current = null
  }

  return {
    onPointerDown: (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") return
      if (event.target instanceof Element && event.target.closest("button")) return
      firedRef.current = false
      startRef.current = { x: event.clientX, y: event.clientY }
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true
        startRef.current = null
        navigator.vibrate?.(12)
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (event: React.PointerEvent) => {
      const start = startRef.current
      if (
        start &&
        Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_TOLERANCE_PX
      ) {
        cancel()
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: React.MouseEvent) => {
      // Chrome Android dispara o menu de contexto no toque longo.
      if (startRef.current || firedRef.current) event.preventDefault()
    },
    onClickCapture: (event: React.MouseEvent) => {
      if (firedRef.current) {
        firedRef.current = false
        event.preventDefault()
        event.stopPropagation()
      }
    },
  }
}

const shortDate = (value: string) => formatDateOnly(value).slice(0, 5)

/** Situação de pagamento de uma despesa, para a coluna de vencimento (ou a 2ª linha no mobile). */
function getPaymentBadge(transaction: Transaction) {
  if (transaction.type !== "EXPENSE") return null
  if (transaction.paymentStatus === "PAID") {
    return {
      label: transaction.paymentDate ? `Pago ${shortDate(transaction.paymentDate)}` : "Pago",
      icon: CheckCircle2,
      className: "text-emerald-600 dark:text-emerald-400",
    }
  }
  if (!transaction.dueDate) return null
  const alert = getTransactionDueAlert(transaction)
  return {
    label: `${alert === "overdue" ? "Venceu" : "Vence"} ${shortDate(transaction.dueDate)}`,
    icon: alert === "overdue" ? AlertTriangle : Clock3,
    className:
      alert === "overdue"
        ? "font-semibold text-amber-600 dark:text-amber-400"
        : alert === "dueSoon"
          ? "font-medium text-orange-600 dark:text-orange-400"
          : "text-muted-foreground",
  }
}

function PaymentBadge({ transaction }: { transaction: Transaction }) {
  const badge = getPaymentBadge(transaction)
  if (!badge) return null
  const Icon = badge.icon
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${badge.className}`}>
      <Icon size={12} className="shrink-0" />
      {badge.label}
    </span>
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
      data-carousel-no-drag
      className="flex h-9 w-6 items-center justify-center rounded-md text-muted-foreground/70 transition hover:bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 sm:w-8"
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
  onShowActions,
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
  const longPress = useLongPress(() => onShowActions(transaction))

  const dueAlert = getTransactionDueAlert(transaction)
  const categoryLabel = transaction.category?.name || "Sem categoria"
  const isExpense = transaction.type === "EXPENSE"
  const linkLabel = transaction.isClearedByInvoice ? "Vínculo com fatura" : "Vincular a uma fatura"

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      {...longPress}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return
        onOpenDetails(transaction)
      }}
      className={`cursor-pointer border-b border-border/60 transition-colors last:border-b-0 pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none] ${
        isDragging
          ? "relative z-10 bg-card shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
          : isDragOver
            ? "bg-primary/8"
            : dueAlert === "overdue"
              ? "bg-amber-500/[0.07] hover:bg-amber-500/[0.12] active:bg-amber-500/[0.16]"
              : "hover:bg-secondary/60 active:bg-secondary"
      }`}
    >
      <td className="w-px py-1 pl-0.5 align-middle sm:pl-1">
        <TransactionDragHandle
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
          disabled={reorderPending}
        />
      </td>
      <td className="w-full max-w-0 py-1.5 pr-2 align-middle">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {transaction.description}
          </span>
          {transaction.recurringGroupId ? (
            <Repeat2 size={12} className="shrink-0 text-primary" aria-label="Recorrente">
              <title>Recorrente</title>
            </Repeat2>
          ) : null}
          {isExpense && transaction.isClearedByInvoice ? (
            <Link size={12} className="shrink-0 text-emerald-500 sm:hidden" aria-label="Vinculada a fatura" />
          ) : null}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] leading-4">
          <span
            className="min-w-0 truncate rounded px-1.5 font-medium"
            style={getCategoryBadgeStyle(categoryLabel)}
          >
            {categoryLabel}
          </span>
          <span className="shrink-0 sm:hidden">
            <PaymentBadge transaction={transaction} />
          </span>
        </div>
      </td>
      <td className="hidden w-px py-2 pr-4 align-middle text-xs sm:table-cell">
        <PaymentBadge transaction={transaction} />
      </td>
      <td
        className={`w-px py-2 pr-2 text-right align-middle text-sm font-semibold whitespace-nowrap tabular-nums sm:pr-3 ${
          isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
        }`}
      >
        {formatCurrency(transaction.amount)}
      </td>
      <td className="hidden w-px py-1 pr-1 align-middle sm:table-cell">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 ${
              isExpense && transaction.isClearedByInvoice ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"
            }`}
            onClick={() => onLink(transaction)}
            disabled={!isExpense}
            aria-label={linkLabel}
            title={linkLabel}
          >
            <Link size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={() => onEdit(transaction)}
            aria-label="Editar transação"
            title="Editar transação"
          >
            <Pencil size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
            onClick={() => onDelete(transaction)}
            aria-label="Excluir transação"
            title="Excluir transação"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

type SheetAction = {
  label: string
  icon: typeof Eye
  onClick: () => void
  destructive?: boolean
}

/** Ações de uma linha no mobile (toque longo): folha que sobe do rodapé. */
function ActionSheet({
  open,
  title,
  subtitle,
  amount,
  amountTone,
  actions,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: ReactNode
  amount: string
  amountTone: "positive" | "negative"
  actions: SheetAction[]
  onClose: () => void
}) {
  // A folha abre com o dedo ainda na tela: o clique de quando ele sai cairia nela (fechando-a ou
  // acionando um botão). Só vale clique cujo toque começou já com a folha aberta.
  const armedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    armedRef.current = false
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4"
      onPointerDownCapture={() => {
        armedRef.current = true
      }}
      onClickCapture={(event) => {
        if (!armedRef.current) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ações de ${title}`}
        className="w-full max-w-md rounded-t-2xl border border-border bg-card pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-20px_60px_rgba(2,6,23,0.35)] sm:rounded-2xl sm:pb-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 pt-3 pb-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{title}</p>
            {subtitle ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>
          <span
            className={`shrink-0 text-base font-semibold tabular-nums ${
              amountTone === "negative"
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {amount}
          </span>
        </div>
        <div className="px-2 pt-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                onClose()
                action.onClick()
              }}
              className={`flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition active:bg-secondary ${
                action.destructive ? "text-rose-600 dark:text-rose-400" : "text-foreground"
              }`}
            >
              <action.icon size={18} className="shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

function TransactionActionSheet({
  transaction,
  onClose,
  onOpenDetails,
  onLink,
  onEdit,
  onDelete,
}: TransactionActions & {
  transaction: Transaction | null
  onClose: () => void
}) {
  if (!transaction) {
    return null
  }

  const isExpense = transaction.type === "EXPENSE"
  const actions: SheetAction[] = [
    { label: "Ver detalhes", icon: Eye, onClick: () => onOpenDetails(transaction) },
    { label: "Editar", icon: Pencil, onClick: () => onEdit(transaction) },
    ...(isExpense
      ? [
          {
            label: transaction.isClearedByInvoice ? "Vínculo com fatura" : "Vincular a uma fatura",
            icon: Link,
            onClick: () => onLink(transaction),
          },
        ]
      : []),
    { label: "Excluir", icon: Trash2, onClick: () => onDelete(transaction), destructive: true },
  ]

  return (
    <ActionSheet
      open
      title={transaction.description}
      subtitle={
        <>
          <span>{transaction.category?.name || "Sem categoria"}</span>
          <PaymentBadge transaction={transaction} />
        </>
      }
      amount={formatCurrency(transaction.amount)}
      amountTone={isExpense ? "negative" : "positive"}
      actions={actions}
      onClose={onClose}
    />
  )
}

/** Linha da tabela de faturas: em edição, o valor vira campo com salvar/cancelar. */
function InvoiceRow({
  label,
  invoice,
  isEditing,
  editingAmount,
  onEditingAmountChange,
  savePending,
  onSave,
  onCancel,
  onEdit,
  onShowActions,
}: {
  label: string
  invoice: Invoice
  isEditing: boolean
  editingAmount: string
  onEditingAmountChange: (amount: string) => void
  savePending: boolean
  onSave: () => void
  onCancel: () => void
  onEdit: () => void
  onShowActions: () => void
}) {
  const longPress = useLongPress(onShowActions)

  if (isEditing) {
    return (
      <tr className="border-b border-border/60 bg-primary/5 last:border-b-0">
        <td colSpan={3} className="max-w-0 px-3 py-2 sm:px-4">
          <div data-carousel-no-drag className="flex items-center gap-2">
            <span className="mr-auto flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
              <CreditCardIcon size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{label}</span>
            </span>
            <div className="w-28 shrink-0 sm:w-44">
              <CurrencyInput value={editingAmount} onValueChange={onEditingAmountChange} />
            </div>
            <Button
              type="button"
              className="h-11 shrink-0 max-sm:w-11 max-sm:px-0"
              onClick={onSave}
              disabled={savePending}
              aria-label="Salvar fatura"
            >
              <span className="hidden sm:inline">{savePending ? "Salvando..." : "Salvar"}</span>
              <Save size={14} />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-11 shrink-0 px-0"
              onClick={onCancel}
              aria-label="Cancelar edição"
            >
              <X size={14} />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr
      {...longPress}
      className="border-b border-border/60 transition-colors last:border-b-0 hover:bg-secondary/60 active:bg-secondary pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]"
    >
      <td className="w-full max-w-0 py-2.5 pr-2 pl-3 align-middle sm:pl-4">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <CreditCardIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </span>
      </td>
      <td className="w-px py-2.5 pr-3 text-right align-middle text-sm font-semibold whitespace-nowrap text-rose-600 tabular-nums sm:pr-3 dark:text-rose-400">
        {formatCurrency(invoice.amount)}
      </td>
      <td className="hidden w-px py-1 pr-1 align-middle sm:table-cell">
        <div className="flex w-[6.5rem] justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={onEdit}
            aria-label={`Editar fatura ${label}`}
            title="Editar fatura"
          >
            <Pencil size={14} />
          </Button>
        </div>
      </td>
    </tr>
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
  const [previewPending, setPreviewPending] = useState(false)
  const [downloadPending, setDownloadPending] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  if (!transaction) {
    return null
  }

  const responsibleLabel =
    responsibleOptions.find(
      (option) => option.id === transaction.responsibleUserId
    )?.label ?? "Geral"

  const details = [
    { label: "Mês", value: periodLabel },
    {
      label: "Competência",
      value: formatDateOnly(transaction.referenceDate) || "Não informado",
    },
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
      value: transaction.createdAt
        ? formatDateTime(transaction.createdAt)
        : "Não informado",
    },
  ]

  const billingDocument = transaction.billingDocument

  const handleDownloadBillingDocument = async () => {
    if (!billingDocument || billingDocument.type !== "FILE") {
      return
    }

    setDownloadPending(true)
    setDownloadError(null)

    try {
      const blob = await transactionService.downloadBillingDocument(transaction.id)
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")

      anchor.href = objectUrl
      anchor.download =
        billingDocument.fileName || `${transaction.description}-documento`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (error) {
      setDownloadError(
        getErrorMessage(error, "Nao foi possivel baixar o documento.")
      )
    } finally {
      setDownloadPending(false)
    }
  }

  const handlePreviewBillingDocument = async () => {
    if (!billingDocument || billingDocument.type !== "FILE") {
      return
    }

    setPreviewPending(true)
    setDownloadError(null)

    try {
      const blob = await transactionService.downloadBillingDocument(transaction.id)
      const objectUrl = window.URL.createObjectURL(blob)
      window.open(objectUrl, "_blank", "noopener,noreferrer")
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000)
    } catch (error) {
      setDownloadError(
        getErrorMessage(error, "Nao foi possivel visualizar o documento.")
      )
    } finally {
      setPreviewPending(false)
    }
  }

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

          {billingDocument ? (
            <div className="mt-4 rounded-xl border border-border/70 bg-secondary/40 px-4 py-4">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Documento para pagamento
              </p>
              <p className="mt-2 text-sm text-foreground">
                {billingDocument.type === "LINK"
                  ? "Link direto disponivel para abrir o documento."
                  : billingDocument.fileName || "Arquivo enviado para esta transacao."}
              </p>
              {downloadError ? (
                <p className="mt-2 text-sm text-destructive">{downloadError}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {billingDocument?.type === "LINK" && billingDocument.url ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(
                    billingDocument.url!,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                Abrir documento
                <ExternalLink size={16} />
              </Button>
            ) : null}
            {billingDocument?.type === "FILE" ? (
              <Button
                type="button"
                disabled={previewPending || downloadPending}
                onClick={handlePreviewBillingDocument}
              >
                {previewPending ? "Abrindo..." : "Visualizar documento"}
                <Eye size={16} />
              </Button>
            ) : null}
            {billingDocument?.type === "FILE" ? (
              <Button
                type="button"
                variant="outline"
                disabled={downloadPending}
                onClick={handleDownloadBillingDocument}
              >
                {downloadPending ? "Baixando..." : "Baixar documento"}
                <Download size={16} />
              </Button>
            ) : null}
          </div>

          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PanelStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: Transaction["type"] | "NEUTRAL"
}) {
  return (
    <div className="min-w-0 px-2 py-1.5 sm:px-3 sm:py-2">
      <dt className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase sm:tracking-[0.14em]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-[13px] font-semibold whitespace-nowrap tabular-nums sm:text-base ${
          tone === "REVENUE"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "EXPENSE"
              ? "text-rose-600 dark:text-rose-400"
              : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

// memo: o dashboard re-renderiza ao trocar de mês (resumo); os painéis só quando os dados mudam.
export const TransactionsWorkspace = memo(function TransactionsWorkspace({
  panel,
  shared,
}: TransactionWorkspaceProps) {
  const queryClient = useQueryClient()
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [form, setForm] = useState<TransactionFormValues>(emptyForm)
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const [detailsTransaction, setDetailsTransaction] =
    useState<Transaction | null>(null)
  const [actionsTransaction, setActionsTransaction] =
    useState<Transaction | null>(null)
  const [actionsInvoice, setActionsInvoice] = useState<Invoice | null>(null)
  const [editingScope, setEditingScope] = useState<"SINGLE" | "GROUP">("SINGLE")
  const [formError, setFormError] = useState<string | null>(null)
  const [submitPending, setSubmitPending] = useState(false)
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)

  const {
    createTransaction,
    createRecurringTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactionMutations(panel.period)
  const transactionLinking = useTransactionLinking(panel.period)
  const invoiceManager = usePeriodInvoiceManager({
    creditCards: shared.creditCards,
    invoices: panel.invoices,
    period: panel.period,
  })

  const reorder = useTransactionReorder({
    period: panel.period,
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
    setSubmitPending(false)
    setForm(emptyForm())
  }

  const refreshTransactionViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: financeKeys.periodTransactionsRoot,
      }),
      queryClient.invalidateQueries({
        queryKey: ["report-spending-by-category"],
      }),
    ])
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
      responsibleUserId: transaction.responsibleUserId || "",
      categoryId: transaction.category?.id || "",
      categoryName: transaction.category?.name || "",
      isRecurring: false,
      occurrences: 2,
      recurringGroupId: transaction.recurringGroupId || null,
      hasDueDate: Boolean(
        transaction.dueDate ||
        transaction.paymentDate ||
        transaction.paymentStatus === "PAID"
      ),
      dueDate: transaction.dueDate || "",
      isPaid: transaction.paymentStatus === "PAID",
      paymentDate: transaction.paymentDate || "",
      billingDocumentType: transaction.billingDocument?.type || "NONE",
      billingDocumentUrl:
        transaction.billingDocument?.type === "LINK"
          ? transaction.billingDocument.url || ""
          : "",
      billingDocumentFile: null,
      billingDocumentExisting: transaction.billingDocument || null,
    })
  }

  const saveTransactionWithBillingDocument = async () => {
    const amount = parseCurrencyInput(form.amount)
    if (!form.description.trim()) {
      throw new Error("Informe a descricao.")
    }
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error("Informe um valor valido.")
    }

    if (form.type === "EXPENSE" && form.hasDueDate && !form.dueDate) {
      throw new Error("Informe a data de vencimento.")
    }

    const canAttachNewBillingDocument =
      form.type === "EXPENSE" && Boolean(form.dueDate)

    if (
      form.billingDocumentType !== "NONE" &&
      !form.billingDocumentExisting &&
      !canAttachNewBillingDocument
    ) {
      throw new Error(
        "Adicione um vencimento antes de anexar um documento para pagamento."
      )
    }

    if (
      form.billingDocumentType === "LINK" &&
      !form.billingDocumentUrl.trim()
    ) {
      throw new Error("Informe o link do documento.")
    }

    if (
      form.billingDocumentType === "FILE" &&
      !form.billingDocumentFile &&
      form.billingDocumentExisting?.type !== "FILE"
    ) {
      throw new Error("Selecione o arquivo do documento.")
    }

    const categoryName = form.categoryName.trim()
    // Sem plano/mês: na edição a transação continua onde está.
    const payload: {
      description: string
      amount: number
      type: Transaction["type"]
      responsibleUserId: string | null
      category: { id?: string; name?: string } | null
      dueDate?: string | null
      paymentDate?: string | null
      paymentStatus?: PaymentStatus | null
      billingDocument?: { type: "LINK"; url: string } | null
    } = {
      description: form.description.trim(),
      amount,
      type: form.type,
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

    if (form.billingDocumentType === "LINK") {
      payload.billingDocument = {
        type: "LINK",
        url: form.billingDocumentUrl.trim(),
      }
    } else if (
      form.billingDocumentType === "NONE" &&
      form.billingDocumentExisting
    ) {
      payload.billingDocument = null
    }

    // Transação nova nasce no mês do painel.
    const newTransactionPlacement = {
      planId: panel.period.planId,
      referenceDate: defaultReferenceDate(panel.period, payload.dueDate),
    }

    const fileToUpload =
      form.billingDocumentType === "FILE" ? form.billingDocumentFile : null
    let uploadTargetId: string | null = null
    let uploadTargetScope: "SINGLE" | "GROUP" = "SINGLE"

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

      if (fileToUpload) {
        uploadTargetId = editingTransaction.id
        uploadTargetScope =
          editingScope === "GROUP" && editingTransaction.recurringGroupId
            ? "GROUP"
            : "SINGLE"
      }
    } else if (form.isRecurring) {
      if (!Number.isFinite(form.occurrences) || form.occurrences < 2) {
        throw new Error("Informe pelo menos 2 meses para a recorrência.")
      }

      const createdTransactions = await createRecurringTransaction.mutateAsync({
        transaction: { ...payload, ...newTransactionPlacement },
        occurrences: Number(form.occurrences),
      })

      if (fileToUpload) {
        uploadTargetId = createdTransactions[0]?.id || null
        uploadTargetScope = "GROUP"
      }
    } else {
      const createdTransaction = await createTransaction.mutateAsync({
        ...payload,
        ...newTransactionPlacement,
      })

      if (fileToUpload) {
        uploadTargetId = createdTransaction.id
        uploadTargetScope = "SINGLE"
      }
    }

    if (fileToUpload) {
      if (!uploadTargetId) {
        throw new Error(
          "Nao foi possivel identificar a transacao para enviar o documento."
        )
      }

      await transactionService.uploadBillingDocumentFile(uploadTargetId, {
        file: fileToUpload,
        scope: uploadTargetScope,
      })
      await refreshTransactionViews()
    }
  }

  const confirmDelete = (entry: Transaction) =>
    setConfirmationDialog({
      confirmLabel: "Excluir Transação",
      description: `A transação "${entry.description}" será removida deste mês.`,
      title: "Excluir transação?",
      onConfirm: () => deleteTransaction.mutate(entry.id),
      ...(entry.recurringGroupId
        ? {
          confirmLabel: "Excluir somente esta",
          description: `A transação "${entry.description}" faz parte de uma recorrência. Você pode remover apenas este mês ou excluir todas as recorrências do grupo.`,
          title: "Excluir transação recorrente?",
          secondaryConfirmLabel: "Excluir todas",
          onSecondaryConfirm: () =>
            deleteTransaction.mutate({
              id: entry.id,
              recurringGroupId: entry.recurringGroupId,
              deleteScope: "GROUP",
            }),
        }
        : {}),
    })

  const transactionActions: TransactionActions = {
    onOpenDetails: setDetailsTransaction,
    onLink: transactionLinking.openPaymentModal,
    onEdit: startEditing,
    onDelete: confirmDelete,
  }
  const closeActions = useCallback(() => setActionsTransaction(null), [])
  const closeInvoiceActions = useCallback(() => setActionsInvoice(null), [])

  const invoiceLabel = (invoice: Invoice) =>
    invoice.creditCardName ||
    shared.creditCards.find((card) => card.id === invoice.creditCardId)?.name ||
    "Cartão"
  const invoicesTotal = panel.invoices.reduce(
    (total, invoice) => total + Number(invoice.amount || 0),
    0
  )

  const submit = async () => {
    setFormError(null)
    setSubmitPending(true)
    try {
      await saveTransactionWithBillingDocument()
      resetComposer()
      setIsComposerOpen(false)
      return

    } finally {
      setSubmitPending(false)
    }
  }

  return (
    <Card className="border-border bg-card p-3 shadow-[0_22px_54px_rgba(15,23,42,0.10)] sm:p-4 xl:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-3">
          <p className="app-eyebrow text-[13px] font-bold text-primary">
            {panel.label}
          </p>
          {!isComposerOpen ? (
            <Button
              type="button"
              size="sm"
              className="xl:hidden"
              onClick={startCreateTransaction}
            >
              Nova transação
              <Plus size={14} />
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <dl className="grid flex-1 grid-cols-3 divide-x divide-border rounded-xl border border-border bg-secondary/45 xl:min-w-[26rem]">
            <PanelStat
              label="Receitas"
              value={formatCurrency(panel.stats.incomes)}
              tone="REVENUE"
            />
            <PanelStat
              label="Despesas"
              value={formatCurrency(panel.stats.expenses)}
              tone="EXPENSE"
            />
            <PanelStat
              label="Saldo"
              value={formatCurrency(panel.stats.balance)}
              tone={toneForBalance(panel.stats.balance)}
            />
          </dl>
          {!isComposerOpen ? (
            <Button
              type="button"
              className="hidden xl:inline-flex"
              onClick={startCreateTransaction}
            >
              Nova transação
              <Plus size={16} />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-5">
        <Card className="gap-0 overflow-hidden border-border bg-card p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-baseline gap-2">
              <h4 className="app-eyebrow">Faturas</h4>
              {panel.invoices.length > 0 ? (
                <span className="truncate text-xs font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                  {formatCurrency(invoicesTotal)}
                </span>
              ) : null}
            </div>
            {!invoiceManager.isCreateOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={invoiceManager.startCreate}
              >
                Nova fatura
                <Plus size={14} />
              </Button>
            ) : null}
          </div>
          {invoiceManager.isCreateOpen ? (
            <div
              data-carousel-no-drag
              className="border-b border-border/70 bg-secondary/40 p-3 sm:p-4"
            >
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
          {panel.invoicesLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Carregando faturas...
            </p>
          ) : panel.invoices.length === 0 ? (
            !invoiceManager.isCreateOpen ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Nenhuma fatura registrada neste mês.
              </p>
            ) : null
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {panel.invoices.map((invoice) => {
                  const label = invoiceLabel(invoice)
                  const isEditing = invoiceManager.editingInvoiceId === invoice.id

                  return (
                    <InvoiceRow
                      key={invoice.id}
                      label={label}
                      invoice={invoice}
                      isEditing={isEditing}
                      editingAmount={invoiceManager.editingAmount}
                      onEditingAmountChange={invoiceManager.setEditingAmount}
                      savePending={invoiceManager.updateInvoice.isPending}
                      onSave={() => invoiceManager.updateInvoice.mutate()}
                      onCancel={invoiceManager.cancelEdit}
                      onEdit={() => invoiceManager.startEdit(invoice)}
                      onShowActions={() => setActionsInvoice(invoice)}
                    />
                  )
                })}
              </tbody>
            </table>
          )}
          {invoiceManager.editingInvoiceId ? (
            <div className="px-3 pb-2 empty:hidden sm:px-4">
              <FormError message={invoiceManager.updateErrorMessage} />
            </div>
          ) : null}
        </Card>
        <ActionSheet
          open={Boolean(actionsInvoice)}
          title={actionsInvoice ? invoiceLabel(actionsInvoice) : ""}
          subtitle={<span>Fatura de cartão · {panel.label}</span>}
          amount={actionsInvoice ? formatCurrency(actionsInvoice.amount) : ""}
          amountTone="negative"
          actions={[
            {
              label: "Editar valor",
              icon: Pencil,
              onClick: () => actionsInvoice && invoiceManager.startEdit(actionsInvoice),
            },
          ]}
          onClose={closeInvoiceActions}
        />

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
            submitPending={submitPending}
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

        <Card className="gap-0 overflow-hidden border-border bg-card p-0">
          <div className="flex items-baseline justify-between gap-3 border-b border-border/70 px-3 py-2.5 sm:px-4">
            <h4 className="app-eyebrow">Transações</h4>
            {groupedTransactions.length > 0 ? (
              <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                Segure a linha para ações
              </p>
            ) : null}
          </div>
          {panel.transactionsLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Carregando transações...
            </p>
          ) : groupedTransactions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
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
              <table className="w-full border-collapse">
                <thead className="hidden sm:table-header-group">
                  <tr className="text-left text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    <th scope="col" className="py-2">
                      <span className="sr-only">Ordem</span>
                    </th>
                    <th scope="col" className="py-2 pr-2 font-semibold">Descrição</th>
                    <th scope="col" className="hidden py-2 pr-2 font-semibold sm:table-cell">Vencimento</th>
                    <th scope="col" className="py-2 pr-2 text-right font-semibold sm:pr-3">Valor</th>
                    <th scope="col" className="hidden py-2 font-semibold sm:table-cell">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                {groupedTransactions.map((group) => {
                  const groupBalance = group.transactions.reduce(
                    (total, transaction) =>
                      total +
                      (transaction.type === "REVENUE" ? 1 : -1) *
                        Number(transaction.amount || 0),
                    0
                  )

                  return (
                    <tbody key={group.id}>
                      <tr className="border-y border-border/70 bg-secondary/60">
                        <th
                          scope="colgroup"
                          colSpan={5}
                          className="px-3 py-1.5 text-left sm:px-4"
                        >
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="truncate font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                              {group.label}
                              <span className="ml-1.5 font-normal tracking-normal normal-case">
                                · {group.transactions.length}
                              </span>
                            </span>
                            <span
                              className={`shrink-0 font-semibold tabular-nums ${
                                groupBalance < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {formatCurrency(groupBalance)}
                            </span>
                          </div>
                        </th>
                      </tr>
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
                            onShowActions={setActionsTransaction}
                            {...transactionActions}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  )
                })}
              </table>
            </DndContext>
          )}
        </Card>
        <TransactionActionSheet
          transaction={actionsTransaction}
          onClose={closeActions}
          {...transactionActions}
        />
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
        {/* Portal: dentro do painel do mês, o fixed ficaria preso à coluna em vez da tela. */}
        {transactionLinking.paymentModalEntry ? createPortal(
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
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
          </div>,
          document.body
        ) : null}
      </div>
    </Card>
  )
})
