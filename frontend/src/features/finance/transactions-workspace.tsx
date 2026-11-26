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
  CalendarSync,
  CalendarX2,
  Gauge,
  CheckCircle2,
  Clock3,
  CreditCard as CreditCardIcon,
  Download,
  Eye,
  ExternalLink,
  GripVertical,
  Link,
  Paperclip,
  Pencil,
  Plus,
  Repeat2,
  Save,
  Search,
  SlidersHorizontal,
  SendHorizonal,
  Trash2,
  X,
} from "lucide-react"
import { createPortal } from "react-dom"
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button.tsx"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card } from "@/components/ui/card.tsx"
import {
  ConfirmationDialog,
  type ConfirmationDialogState,
} from "@/components/ui/confirmation-dialog.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Label } from "@/components/ui/label.tsx"
import { PillGroup } from "@/components/ui/pill-group.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import { getCategoryBadgeStyle } from "@/features/finance/category-colors.ts"
import {
  useInvoicePayment,
  usePeriodInvoiceManager,
  useSubscriptionMutations,
  useSubscriptions,
  useTransactionPayment,
  useTransactionLinking,
  useTransactionMutations,
} from "@/features/finance/hooks.ts"
import {
  resolveActiveMonthId,
  useDashboardStore,
} from "@/features/finance/dashboard-store.ts"
import { TransactionComposer } from "@/features/finance/transaction-composer.tsx"
import { PaymentDateMenu, PaymentDayChips } from "@/features/finance/payment-date-menu.tsx"
import { financeKeys, transactionService } from "@/features/finance/services.ts"
import {
  buildTransactionGroups,
  matchesQuickFilter,
  matchesSearch,
  normalizeSearchText,
  TRANSACTION_QUICK_FILTERS,
  useTransactionReorder,
  type TransactionQuickFilter,
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
  canTogglePayment,
  invoiceAsBill,
  formatCurrency,
  formatDateOnly,
  type ForecastMonth,
  formatDateTime,
  formatMonthLabel,
  getTransactionDueAlert,
  defaultReferenceDate,
  parseCurrencyInput,
} from "@/features/finance/utils.ts"
import { getErrorMessage } from "@/lib/errors.ts"
import { useEscapeKey } from "@/lib/use-escape-key.ts"

/**
 * O que ainda falta das previsões do mês (mês atual e futuros), em linhas tracejadas no fim da
 * lista: o mês não parece vazio e dá para ver o que ainda vai sair. Não são transações.
 */
function ForecastPendingRows({ forecast }: { forecast?: ForecastMonth }) {
  const items = (forecast?.items ?? []).filter((item) => item.pending > 0)
  if (items.length === 0) return null

  return (
    <div className="border-t border-border/70" aria-label="Previsto no mês">
      <div className="flex items-center justify-between gap-2 bg-secondary/40 px-3 py-1.5 sm:px-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          <Gauge size={12} aria-hidden="true" />
          Previsto · {items.length}
        </p>
        <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          ~{formatCurrency(forecast?.pending ?? 0)}
        </p>
      </div>
      <ul>
        {items.map((item) => (
          <li
            key={item.forecast.id}
            className="mx-2 my-1.5 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2 sm:mx-3"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-muted-foreground">
                {item.label}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {item.actual > 0
                  ? `${formatCurrency(item.actual)} de ${formatCurrency(item.planned)} gastos`
                  : item.dueDate
                    ? `Conta prevista · vence ${formatDateOnly(item.dueDate).slice(0, 5)}`
                    : "Previsto para o mês"}
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">
              ~{formatCurrency(item.pending)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type TransactionWorkspaceProps = {
  panel: {
    period: Period
    label: string
    transactions: Transaction[]
    invoices: Invoice[]
    transactionsLoading: boolean
    invoicesLoading: boolean
    /** Previsto × real do mês (previsões por categoria). */
    forecast?: ForecastMonth
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
  isSubscription: false,
  subscriptionCardId: "",
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
  /** Sem data: alterna (pendente ↔ pago hoje). Com data: marca como pago nessa data. */
  onTogglePaid: (transaction: Transaction, paymentDate?: string) => void
  onOpenDocument: (transaction: Transaction) => void
  /** Cobrança de assinatura: "ACTIVE" (pode encerrar), "ENDED" (pode reativar); senão null. */
  subscriptionStatus: (transaction: Transaction) => "ACTIVE" | "ENDED" | null
  onEndSubscription: (transaction: Transaction) => void
  onResumeSubscription: (transaction: Transaction) => void
}

type TransactionRowProps = TransactionActions & {
  transaction: Transaction
  isDragOver: boolean
  reorderPending: boolean
  onShowActions: (transaction: Transaction) => void
}

const shortDate = (value: string) => formatDateOnly(value).slice(0, 5)

/** Mesmo corte do `sm:` do Tailwind, a partir do qual a linha mostra os botões de ação. */
const isDesktopViewport = () => window.matchMedia("(min-width: 640px)").matches

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

/** Documento que dá para abrir: arquivo enviado ou link http(s). */
function hasOpenableDocument(transaction: Transaction) {
  const doc = transaction.billingDocument
  if (!doc) return false
  return doc.type === "FILE" || Boolean(doc.url && isHttpUrl(doc.url))
}

function billingDocumentLabel(transaction: Transaction) {
  return transaction.paymentStatus === "PAID" ? "comprovante" : "boleto"
}

/**
 * Abre o boleto/comprovante numa nova aba. A aba é aberta já no clique (antes do download), senão o
 * Safari/iOS bloqueia como pop-up; o arquivo entra nela quando chegar.
 */
async function openBillingDocument(transaction: Transaction) {
  const doc = transaction.billingDocument
  if (!doc) return

  if (doc.type === "LINK") {
    if (!doc.url || !isHttpUrl(doc.url)) {
      throw new Error("O link do documento é inválido.")
    }
    window.open(doc.url, "_blank", "noopener,noreferrer")
    return
  }

  const tab = window.open("", "_blank")
  if (tab) {
    tab.opener = null
    tab.document.title = "Abrindo documento..."
  }
  try {
    const blob = await transactionService.downloadBillingDocument(transaction.id)
    const objectUrl = window.URL.createObjectURL(blob)
    if (tab) {
      tab.location.href = objectUrl
    } else {
      window.location.assign(objectUrl)
    }
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000)
  } catch (error) {
    tab?.close()
    throw error
  }
}

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
  onTogglePaid,
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

  const dueAlert = getTransactionDueAlert(transaction)
  const categoryLabel = transaction.category?.name || "Sem categoria"
  const isExpense = transaction.type === "EXPENSE"
  const linkLabel = transaction.isClearedByInvoice ? "Vínculo com fatura" : "Vincular a uma fatura"
  const canPay = canTogglePayment(transaction)
  const isPaid = canPay && transaction.paymentStatus === "PAID"

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
      }}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return
        // No desktop a linha já tem os botões de ação; o clique abre os detalhes. No celular, as ações.
        if (isDesktopViewport()) onOpenDetails(transaction)
        else onShowActions(transaction)
      }}
      className={`cursor-pointer border-b border-border/60 transition-colors last:border-b-0 ${
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
          {transaction.subscriptionId ? (
            <CalendarSync size={12} className="shrink-0 text-primary" aria-label="Assinatura">
              <title>Assinatura</title>
            </CalendarSync>
          ) : transaction.recurringGroupId ? (
            <Repeat2 size={12} className="shrink-0 text-primary" aria-label="Recorrente">
              <title>Recorrente</title>
            </Repeat2>
          ) : null}
          {transaction.billingDocument ? (
            <Paperclip size={12} className="shrink-0 text-muted-foreground" aria-label="Com documento anexado">
              <title>{transaction.billingDocument.type === "LINK" ? "Link do documento" : "Documento anexado"}</title>
            </Paperclip>
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
          {canPay && !isPaid ? (
            <PaymentDateMenu
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "size-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400",
              })}
              aria-label="Marcar como pago"
              title="Marcar como pago (escolha a data)"
              onSelect={(paymentDate) => onTogglePaid(transaction, paymentDate)}
            >
              <CheckCircle2 size={14} />
            </PaymentDateMenu>
          ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`size-8 ${
              isPaid
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
            onClick={() => onTogglePaid(transaction)}
            disabled={!canPay}
            aria-label={isPaid ? "Marcar como pendente" : "Marcar como pago"}
            aria-pressed={canPay ? isPaid : undefined}
            title={
              canPay
                ? isPaid
                  ? "Marcar como pendente"
                  : "Marcar como pago hoje"
                : "Sem vencimento: não há pagamento a registrar"
            }
          >
            <CheckCircle2 size={14} />
          </Button>
          )}
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

/** Ações de uma linha (clique): folha que sobe do rodapé no mobile e modal centrado no desktop. */
function ActionSheet({
  open,
  title,
  subtitle,
  amount,
  amountTone,
  actions,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: ReactNode
  amount: string
  amountTone: "positive" | "negative"
  actions: SheetAction[]
  onClose: () => void
  children?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
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
        {children}
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
  onTogglePaid,
  onOpenDocument,
  subscriptionStatus,
  onEndSubscription,
  onResumeSubscription,
}: TransactionActions & {
  transaction: Transaction | null
  onClose: () => void
}) {
  if (!transaction) {
    return null
  }

  const isExpense = transaction.type === "EXPENSE"
  const actions: SheetAction[] = [
    ...(canTogglePayment(transaction) && transaction.paymentStatus === "PAID"
      ? [{ label: "Marcar como pendente", icon: Clock3, onClick: () => onTogglePaid(transaction) }]
      : []),
    ...(hasOpenableDocument(transaction)
      ? [
          {
            label: `Abrir ${billingDocumentLabel(transaction)}`,
            icon: Paperclip,
            onClick: () => onOpenDocument(transaction),
          },
        ]
      : []),
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
    ...(subscriptionStatus(transaction) === "ACTIVE"
      ? [{ label: "Encerrar assinatura", icon: CalendarX2, onClick: () => onEndSubscription(transaction) }]
      : subscriptionStatus(transaction) === "ENDED"
        ? [{ label: "Reativar assinatura", icon: CalendarSync, onClick: () => onResumeSubscription(transaction) }]
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
    >
      {canTogglePayment(transaction) && transaction.paymentStatus !== "PAID" ? (
        <PaymentDayChips
          onSelect={(paymentDate) => {
            onClose()
            onTogglePaid(transaction, paymentDate)
          }}
        />
      ) : null}
    </ActionSheet>
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
  onDelete,
  onTogglePaid,
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
  onDelete: () => void
  onTogglePaid: (paymentDate?: string) => void
  onShowActions: () => void
}) {
  if (isEditing) {
    return (
      <tr className="border-b border-border/60 bg-primary/5 last:border-b-0">
        <td colSpan={3} className="max-w-0 px-3 py-2 sm:px-4">
          {/* Só o valor: o vencimento vem do dia de vencimento do cartão (tela Cartões).
              Celular: nome; valor, salvar e cancelar. Desktop: tudo numa linha. */}
          <div data-carousel-no-drag className="flex flex-wrap items-end gap-2">
            <span className="flex w-full min-w-0 items-center gap-2 self-center text-sm font-medium text-foreground sm:mr-auto sm:w-auto">
              <CreditCardIcon size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate">{label}</span>
            </span>
            <label className="flex min-w-0 flex-1 flex-col gap-1 sm:w-40 sm:flex-none">
              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:sr-only">
                Valor
              </span>
              <CurrencyInput value={editingAmount} onValueChange={onEditingAmountChange} />
            </label>
            <Button
              type="button"
              className="h-11 shrink-0"
              onClick={onSave}
              disabled={savePending}
              aria-label="Salvar fatura"
            >
              {savePending ? "Salvando..." : "Salvar"}
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

  const bill = invoiceAsBill(invoice, label)
  // Fatura pode ser paga com ou sem vencimento (o vencimento só a coloca em "Contas a pagar").
  const isPaid = invoice.paymentStatus === "PAID"
  const overdue = getTransactionDueAlert(bill) === "overdue"

  return (
    <tr
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return
        onShowActions()
      }}
      className={`cursor-pointer border-b border-border/60 transition-colors last:border-b-0 ${
        overdue
          ? "bg-amber-500/[0.07] hover:bg-amber-500/[0.12] active:bg-amber-500/[0.16]"
          : "hover:bg-secondary/60 active:bg-secondary"
      }`}
    >
      <td className="w-full max-w-0 py-2 pr-2 pl-3 align-middle sm:pl-4">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <CreditCardIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
        </span>
        {invoice.dueDate || isPaid ? (
          <span className="mt-0.5 block pl-[22px] text-[11px] leading-4">
            <PaymentBadge transaction={bill} />
          </span>
        ) : null}
      </td>
      <td className="w-px py-2 pr-3 text-right align-middle text-sm font-semibold whitespace-nowrap text-rose-600 tabular-nums sm:pr-3 dark:text-rose-400">
        {formatCurrency(invoice.amount)}
      </td>
      <td className="hidden w-px py-1 pr-1 align-middle sm:table-cell">
        <div className="flex w-[6.5rem] justify-end">
          {!isPaid ? (
            <PaymentDateMenu
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "size-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400",
              })}
              aria-label={`Marcar fatura ${label} como paga`}
              title="Marcar como paga (escolha a data)"
              onSelect={(paymentDate) => onTogglePaid(paymentDate)}
            >
              <CheckCircle2 size={14} />
            </PaymentDateMenu>
          ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-emerald-500 dark:text-emerald-400"
            onClick={() => onTogglePaid()}
            aria-pressed
            aria-label={`Marcar fatura ${label} como pendente`}
            title="Marcar como pendente"
          >
            <CheckCircle2 size={14} />
          </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={onEdit}
            aria-label={`Editar fatura ${label}`}
            title="Editar valor e vencimento"
          >
            <Pencil size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-rose-600 hover:text-rose-700 dark:text-rose-400"
            onClick={onDelete}
            aria-label={`Excluir fatura ${label}`}
            title="Excluir fatura"
          >
            <Trash2 size={14} />
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
  useEscapeKey(Boolean(transaction), onClose)

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
    setPreviewPending(true)
    setDownloadError(null)

    try {
      await openBillingDocument(transaction)
    } catch (error) {
      setDownloadError(
        getErrorMessage(error, "Não foi possível abrir o documento.")
      )
    } finally {
      setPreviewPending(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes de ${transaction.description}`}
        onClick={(event) => event.stopPropagation()}
        className="grid max-h-[90vh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)]"
      >
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
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
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
            {billingDocument?.type === "LINK" && hasOpenableDocument(transaction) ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviewBillingDocument}
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

/**
 * Esqueleto do painel do mês: aparece na hora ao navegar, enquanto o mês carrega (e nos meses
 * pré-carregados longe do visível), no lugar do painel completo, que é caro de montar.
 */
export function TransactionsWorkspaceSkeleton({ label }: { label: string }) {
  return (
    <Card
      className="border-border bg-card p-3 shadow-[0_22px_54px_rgba(15,23,42,0.10)] sm:p-4 xl:p-5"
      aria-busy="true"
      aria-label={`Carregando ${label}`}
    >
      <div className="mb-4 flex justify-end max-sm:hidden">
        <div className="h-8 w-32 animate-pulse rounded-full bg-secondary" />
      </div>
      <div className="space-y-4 sm:space-y-5">
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5 sm:px-4">
            <div className="h-3 w-28 animate-pulse rounded bg-secondary" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-secondary" />
          </div>
          {[0, 1].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between border-b border-border/60 px-3 py-3 last:border-b-0 sm:px-4"
            >
              <div className="h-3.5 w-32 animate-pulse rounded bg-secondary" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="border-b border-border/70 px-3 py-2.5 sm:px-4">
            <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 sm:px-4"
            >
              <div className="h-6 w-3 animate-pulse rounded bg-secondary" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div
                  className="h-3.5 animate-pulse rounded bg-secondary"
                  style={{ width: `${45 + ((row * 17) % 35)}%` }}
                />
                <div className="h-3 w-16 animate-pulse rounded bg-secondary/70" />
              </div>
              <div className="h-3.5 w-20 animate-pulse rounded bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * Os objetos de painel são recriados sempre que qualquer mês da janela atualiza (useQueries devolve
 * um array novo); o painel só re-renderiza quando os dados do próprio mês mudam.
 */
function samePanelData(
  previous: TransactionWorkspaceProps,
  next: TransactionWorkspaceProps
) {
  const a = previous.panel
  const b = next.panel
  return (
    previous.shared === next.shared &&
    a.period.id === b.period.id &&
    a.period.planId === b.period.planId &&
    a.label === b.label &&
    a.transactions === b.transactions &&
    a.invoices === b.invoices &&
    a.transactionsLoading === b.transactionsLoading &&
    a.invoicesLoading === b.invoicesLoading
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
  const transactionPayment = useTransactionPayment(panel.period.planId)
  const subscriptionMutations = useSubscriptionMutations(panel.period.planId)
  const subscriptionsQuery = useSubscriptions(panel.period.planId)
  const subscriptionById = useMemo(
    () => new Map((subscriptionsQuery.data ?? []).map((item) => [item.id, item])),
    [subscriptionsQuery.data]
  )
  useEscapeKey(
    Boolean(transactionLinking.paymentModalEntry),
    transactionLinking.closePaymentModal
  )
  const [documentError, setDocumentError] = useState<string | null>(null)
  const [focusSignal, setFocusSignal] = useState(0)
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

  // Busca e filtro rápido. Com filtro ativo a ordenação por arrastar fica desligada: reordenar
  // uma lista parcial embaralharia a posição das linhas escondidas.
  const [searchQuery, setSearchQuery] = useState("")
  const [quickFilter, setQuickFilter] = useState<TransactionQuickFilter>("ALL")
  const normalizedQuery = normalizeSearchText(searchQuery)
  const isFiltering = normalizedQuery !== "" || quickFilter !== "ALL"
  const activeFilterCount = (normalizedQuery !== "" ? 1 : 0) + (quickFilter !== "ALL" ? 1 : 0)
  // No celular a busca e os filtros rápidos ficam recolhidos atrás do botão "Filtrar".
  const [filtersOpen, setFiltersOpen] = useState(false)
  const quickFilterCounts = useMemo(() => {
    const counts = {} as Record<TransactionQuickFilter, number>
    for (const { value } of TRANSACTION_QUICK_FILTERS) {
      counts[value] = reorder.transactions.filter(
        (transaction) =>
          matchesSearch(transaction, normalizedQuery) &&
          matchesQuickFilter(transaction, value)
      ).length
    }
    return counts
  }, [normalizedQuery, reorder.transactions])
  const visibleGroups = useMemo(
    () =>
      isFiltering
        ? groupedTransactions
            .map((group) => ({
              ...group,
              transactions: group.transactions.filter(
                (transaction) =>
                  matchesSearch(transaction, normalizedQuery) &&
                  matchesQuickFilter(transaction, quickFilter)
              ),
            }))
            .filter((group) => group.transactions.length > 0)
        : groupedTransactions,
    [groupedTransactions, isFiltering, normalizedQuery, quickFilter]
  )
  const categoryOptions = useMemo(
    () =>
      shared.transactionCategories.map((category) => ({
        label: category.name,
        value: category.id,
      })),
    [shared.transactionCategories]
  )
  const cardOptions = useMemo(
    () => shared.creditCards.map((card) => ({ label: card.name || "Cartão", value: card.id })),
    [shared.creditCards]
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
    if (transactionPayment.error) {
      return getErrorMessage(
        transactionPayment.error,
        "Não foi possível atualizar o pagamento."
      )
    }
    return null
  }, [
    transactionPayment.error,
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

  // Pedido de nova transação vindo de fora (atalho N, botão + do celular): só o mês ativo atende.
  // Também confere na montagem, para o pedido feito antes de o painel carregar.
  const periodId = panel.period.id
  useEffect(() => {
    const handle = (state: ReturnType<typeof useDashboardStore.getState>) => {
      if (!state.composerRequested) return
      if (resolveActiveMonthId(state.selectedMonthId) !== periodId) return
      state.consumeComposerRequest()
      setEditingTransaction(null)
      setEditingScope("SINGLE")
      setFormError(null)
      setForm(emptyForm())
      setIsComposerOpen(true)
    }
    handle(useDashboardStore.getState())
    return useDashboardStore.subscribe(handle)
  }, [periodId])

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
      isSubscription: false,
      subscriptionCardId:
        (transaction.subscriptionId &&
          subscriptionById.get(transaction.subscriptionId)?.creditCardId) ||
        "",
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

      // Cobrança de assinatura com "esta e as próximas": a assinatura muda e, com ela, as cobranças
      // pendentes a partir do mês atual.
      if (editingScope === "GROUP" && editingTransaction.subscriptionId && form.type === "EXPENSE") {
        const billingDate = payload.dueDate || editingTransaction.referenceDate
        await subscriptionMutations.update.mutateAsync({
          id: editingTransaction.subscriptionId,
          payload: {
            name: payload.description,
            amount: payload.amount,
            category: payload.category,
            responsibleUserId: payload.responsibleUserId,
            billingDay: Number(billingDate.slice(8, 10)),
            chargeMode: payload.dueDate ? "BILL" : "AUTO",
            creditCardId: form.subscriptionCardId || null,
          },
        })
      }

      if (fileToUpload) {
        uploadTargetId = editingTransaction.id
        uploadTargetScope =
          editingScope === "GROUP" && editingTransaction.recurringGroupId
            ? "GROUP"
            : "SINGLE"
      }
    } else if (form.isSubscription && form.type === "EXPENSE") {
      // Assinatura: a cobrança deste mês e as próximas são geradas pelo servidor.
      const billingDate = payload.dueDate || newTransactionPlacement.referenceDate
      await subscriptionMutations.create.mutateAsync({
        name: payload.description,
        amount: payload.amount,
        category: payload.category,
        responsibleUserId: payload.responsibleUserId,
        billingDay: Number(billingDate.slice(8, 10)),
        // Com cartão, a cobrança entra na fatura do mês no dia do vencimento.
        chargeMode: payload.dueDate ? "BILL" : "AUTO",
        creditCardId: form.subscriptionCardId || null,
        startMonth: panel.period.id,
        endMonth: null,
      })
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
      ...(entry.subscriptionId && subscriptionStatus(entry) === "ACTIVE"
        ? {
          confirmLabel: "Pular este mês",
          description: `"${entry.description}" é uma assinatura. Você pode remover só a cobrança deste mês (as próximas continuam) ou encerrar a assinatura a partir daqui.`,
          title: "Excluir cobrança da assinatura?",
          secondaryConfirmLabel: "Encerrar assinatura",
          onSecondaryConfirm: () => endSubscription(entry, { deleteCharge: true }),
        }
        : {}),
    })

  /** Mês (AAAA-MM) da cobrança: a assinatura termina nele. */
  const chargeMonthOf = (entry: Transaction) => (entry.referenceDate ?? "").slice(0, 7)

  function subscriptionStatus(entry: Transaction) {
    if (!entry.subscriptionId) return null
    const subscription = subscriptionById.get(entry.subscriptionId)
    if (!subscription) return null
    return subscription.endMonth && subscription.endMonth <= chargeMonthOf(entry)
      ? ("ENDED" as const)
      : ("ACTIVE" as const)
  }

  function endSubscription(entry: Transaction, options: { deleteCharge?: boolean } = {}) {
    if (!entry.subscriptionId) return
    setDocumentError(null)
    const subscriptionId = entry.subscriptionId
    const end = () =>
      subscriptionMutations.update.mutate(
        { id: subscriptionId, payload: { endMonth: chargeMonthOf(entry) } },
        {
          onError: (error) =>
            setDocumentError(getErrorMessage(error, "Não foi possível encerrar a assinatura.")),
        }
      )
    if (options.deleteCharge) deleteTransaction.mutate(entry.id, { onSuccess: end })
    else end()
  }

  const confirmEndSubscription = (entry: Transaction) =>
    setConfirmationDialog({
      eyebrow: "Assinatura",
      title: "Encerrar assinatura?",
      description: `"${entry.description}" para de gerar cobranças depois de ${formatMonthLabel(Number(chargeMonthOf(entry).slice(5, 7))).toLowerCase()}/${chargeMonthOf(entry).slice(0, 4)}. A cobrança deste mês e o histórico continuam.`,
      confirmLabel: "Encerrar",
      onConfirm: () => endSubscription(entry),
    })

  const invoicePayment = useInvoicePayment(panel.period.planId)
  const toggleInvoicePaid = (invoice: Invoice, paymentDate?: string) =>
    invoicePayment.mutate({
      invoice,
      paid: paymentDate ? true : invoice.paymentStatus !== "PAID",
      paymentDate,
    })

  const confirmDeleteInvoice = (invoice: Invoice) => {
    const linkedCount = linkedTransactionsOf(invoice).length
    setConfirmationDialog({
      confirmLabel: "Excluir Fatura",
      title: "Excluir fatura?",
      description:
        `A fatura de ${invoiceLabel(invoice)} em ${panel.label} será removida.` +
        (linkedCount > 0
          ? ` ${linkedCount === 1 ? "A transação vinculada será desvinculada e volta" : `As ${linkedCount} transações vinculadas serão desvinculadas e voltam`} a contar nos totais do mês.`
          : ""),
      onConfirm: () => invoiceManager.deleteInvoice.mutate(invoice),
    })
  }

  const transactionActions: TransactionActions = {
    onOpenDetails: setDetailsTransaction,
    onLink: transactionLinking.openPaymentModal,
    onEdit: startEditing,
    onDelete: confirmDelete,
    onTogglePaid: (transaction, paymentDate) =>
      transactionPayment.mutate({
        transaction,
        paid: paymentDate ? true : transaction.paymentStatus !== "PAID",
        paymentDate,
      }),
    subscriptionStatus,
    onEndSubscription: confirmEndSubscription,
    onResumeSubscription: (transaction) => {
      if (!transaction.subscriptionId) return
      setDocumentError(null)
      subscriptionMutations.update.mutate(
        { id: transaction.subscriptionId, payload: { endMonth: null } },
        {
          onError: (error) =>
            setDocumentError(getErrorMessage(error, "Não foi possível reativar a assinatura.")),
        }
      )
    },
    onOpenDocument: (transaction) => {
      setDocumentError(null)
      openBillingDocument(transaction).catch((error) =>
        setDocumentError(
          getErrorMessage(error, "Não foi possível abrir o documento.")
        )
      )
    },
  }
  const closeActions = useCallback(() => setActionsTransaction(null), [])
  const closeInvoiceActions = useCallback(() => setActionsInvoice(null), [])
  const linkedTransactionsOf = (invoice: Invoice) =>
    panel.transactions.filter(
      (transaction) => transaction.creditCardInvoiceId === invoice.id
    )
  const actionsInvoiceLinked = actionsInvoice
    ? linkedTransactionsOf(actionsInvoice)
    : []

  const invoiceLabel = (invoice: Invoice) =>
    invoice.creditCardName ||
    shared.creditCards.find((card) => card.id === invoice.creditCardId)?.name ||
    "Cartão"
  const invoicesTotal = panel.invoices.reduce(
    (total, invoice) => total + Number(invoice.amount || 0),
    0
  )

  const submit = async ({ keepOpen }: { keepOpen: boolean }) => {
    setFormError(null)
    setSubmitPending(true)
    try {
      await saveTransactionWithBillingDocument()
      if (keepOpen) {
        // Lançamento em sequência: mantém tipo e responsável, limpa o resto e volta o foco.
        setEditingTransaction(null)
        setEditingScope("SINGLE")
        setForm((current) => ({
          ...emptyForm(),
          type: current.type,
          responsibleUserId: current.responsibleUserId,
        }))
        setFocusSignal((value) => value + 1)
        return
      }
      resetComposer()
      setIsComposerOpen(false)
      return

    } finally {
      setSubmitPending(false)
    }
  }

  return (
    <Card className="border-border bg-card p-3 shadow-[0_22px_54px_rgba(15,23,42,0.10)] sm:p-4 xl:p-5">
      {/* Receitas/despesas/saldo e o nome do mês ficam no resumo acima do carrossel. No celular o
          "+" da barra inferior já cria transação. */}
      {!isComposerOpen ? (
        <div className="mb-4 flex justify-end max-sm:hidden">
          <Button type="button" size="sm" onClick={startCreateTransaction}>
            Nova transação
            <Plus size={14} />
          </Button>
        </div>
      ) : null}

      <div className="space-y-4 sm:space-y-5">
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
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                {shared.creditCards.length === 0 ? (
                  <p className="self-center text-sm text-muted-foreground">
                    Nenhum cartão no plano. Cadastre um na tela Cartões.
                  </p>
                ) : (
                  <PillGroup
                    id="new-invoice-card"
                    label="Cartão"
                    value={invoiceManager.createForm.creditCardId}
                    options={shared.creditCards.map((card) => ({
                      value: card.id,
                      label: card.name || "Cartão",
                      icon: CreditCardIcon,
                    }))}
                    onChange={(creditCardId) =>
                      invoiceManager.setCreateForm((current) => ({ ...current, creditCardId }))
                    }
                  />
                )}
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
          {/* Espaço mínimo de duas faturas: meses sem fatura não deixam o painel mais baixo. */}
          <div className="min-h-[5.125rem]">
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
                        onDelete={() => confirmDeleteInvoice(invoice)}
                        onTogglePaid={(paymentDate) => toggleInvoicePaid(invoice, paymentDate)}
                        onShowActions={() => setActionsInvoice(invoice)}
                      />
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
          {invoiceManager.editingInvoiceId ? (
            <div className="px-3 pb-2 empty:hidden sm:px-4">
              <FormError message={invoiceManager.updateErrorMessage} />
            </div>
          ) : null}
          {invoiceManager.deleteErrorMessage || invoicePayment.error ? (
            <div className="px-3 pb-2 sm:px-4">
              <FormError
                message={
                  invoiceManager.deleteErrorMessage ||
                  getErrorMessage(invoicePayment.error, "Não foi possível atualizar o pagamento da fatura.")
                }
              />
            </div>
          ) : null}
        </Card>
        <ActionSheet
          open={Boolean(actionsInvoice)}
          title={actionsInvoice ? invoiceLabel(actionsInvoice) : ""}
          subtitle={
            <>
              <span>Fatura de cartão · {panel.label}</span>
              {actionsInvoice?.dueDate || actionsInvoice?.paymentStatus === "PAID" ? (
                <PaymentBadge transaction={invoiceAsBill(actionsInvoice, invoiceLabel(actionsInvoice))} />
              ) : null}
              {actionsInvoiceLinked.length > 0 ? (
                <span>
                  · {actionsInvoiceLinked.length}{" "}
                  {actionsInvoiceLinked.length === 1
                    ? "transação vinculada"
                    : "transações vinculadas"}
                </span>
              ) : null}
            </>
          }
          amount={actionsInvoice ? formatCurrency(actionsInvoice.amount) : ""}
          amountTone="negative"
          actions={[
            ...(actionsInvoice?.paymentStatus === "PAID"
              ? [
                  {
                    label: "Marcar como pendente",
                    icon: Clock3,
                    onClick: () => actionsInvoice && toggleInvoicePaid(actionsInvoice),
                  },
                ]
              : []),
            {
              label: "Editar valor",
              icon: Pencil,
              onClick: () => actionsInvoice && invoiceManager.startEdit(actionsInvoice),
            },
            {
              label: "Excluir fatura",
              icon: Trash2,
              destructive: true,
              onClick: () => actionsInvoice && confirmDeleteInvoice(actionsInvoice),
            },
          ]}
          onClose={closeInvoiceActions}
        >
          {actionsInvoice && actionsInvoice.paymentStatus !== "PAID" ? (
            <PaymentDayChips
              label="Marcar como paga"
              onSelect={(paymentDate) => {
                const invoice = actionsInvoice
                closeInvoiceActions()
                toggleInvoicePaid(invoice, paymentDate)
              }}
            />
          ) : null}
          {actionsInvoiceLinked.length > 0 ? (
            <div className="border-b border-border/70 px-4 py-2">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Transações vinculadas
              </p>
              <ul className="mt-1 max-h-40 divide-y divide-border/50 overflow-y-auto">
                {actionsInvoiceLinked.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between gap-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-foreground">
                      {transaction.description}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </ActionSheet>

        <div>
          <TransactionComposer
            isOpen={isComposerOpen}
            periodLabel={panel.label}
            periodId={panel.period.id}
            form={form}
            setForm={setForm}
            editingTransaction={editingTransaction}
            showCancel={Boolean(editingTransaction || isComposerOpen)}
            editingScope={editingScope}
            setEditingScope={setEditingScope}
            categoryOptions={categoryOptions}
            responsibleOptions={shared.responsibleOptions}
            cardOptions={cardOptions}
            formError={formError}
            mutationError={mutationError}
            createPending={createTransaction.isPending}
            createRecurringPending={createRecurringTransaction.isPending}
            updatePending={updateTransaction.isPending}
            submitPending={submitPending}
            focusSignal={focusSignal}
            onSubmit={async (event, options) => {
              event.preventDefault()
              try {
                await submit(options)
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
            <h4 className="app-eyebrow self-center">Transações</h4>
            {documentError ? (
              <p role="alert" className="truncate text-[11px] text-rose-600 dark:text-rose-400">
                {documentError}
              </p>
            ) : groupedTransactions.length > 0 ? (
              <button
                type="button"
                data-carousel-no-drag
                className={`flex h-8 shrink-0 items-center gap-1.5 self-center rounded-full border px-3 text-xs font-medium transition sm:hidden ${
                  filtersOpen || activeFilterCount > 0
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
                aria-expanded={filtersOpen}
                aria-controls={`transaction-filters-${panel.period.id}`}
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                Filtrar
                {activeFilterCount > 0 ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
          {groupedTransactions.length > 0 ? (
            <div
              id={`transaction-filters-${panel.period.id}`}
              data-carousel-no-drag
              className={`flex-col gap-2 border-b border-border/70 px-3 py-2 sm:flex sm:flex-row sm:items-center sm:px-4 ${
                filtersOpen ? "flex" : "hidden"
              }`}
            >
              <label className="relative block sm:w-56 sm:shrink-0">
                <span className="sr-only">Buscar transação</span>
                <Search
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && searchQuery) {
                      event.preventDefault()
                      setSearchQuery("")
                    }
                  }}
                  placeholder="Buscar descrição ou categoria"
                  className="h-9 w-full rounded-lg border border-border bg-card/90 pr-3 pl-8 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 sm:text-sm"
                />
              </label>
              <div
                role="group"
                aria-label="Filtro rápido"
                // Rola na horizontal no celular: arrastar aqui não troca de mês.
                data-carousel-no-drag
                className="-mx-3 flex min-w-0 gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:flex-1 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {TRANSACTION_QUICK_FILTERS.map(({ value, label }) => {
                  const selected = quickFilter === value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setQuickFilter(selected && value !== "ALL" ? "ALL" : value)}
                      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                      <span className={`tabular-nums ${selected ? "opacity-85" : "opacity-70"}`}>
                        {quickFilterCounts[value]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
          {panel.transactionsLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Carregando transações...
            </p>
          ) : groupedTransactions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Nenhuma transação cadastrada.
            </p>
          ) : visibleGroups.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground">
              <span>Nenhuma transação com esse filtro.</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setQuickFilter("ALL")
                }}
              >
                Limpar filtros
              </Button>
            </div>
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
                {visibleGroups.map((group) => {
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
                            reorderPending={reorder.reorderPending || isFiltering}
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
          <ForecastPendingRows forecast={panel.forecast} />
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
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            onClick={transactionLinking.closePaymentModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Vincular transação a uma fatura"
              onClick={(event) => event.stopPropagation()}
              className="grid max-h-[90vh] w-full max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)]"
            >
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
                  <Label id="link-invoice-label">Fatura</Label>
                  {/* Pílulas como no formulário: uma por fatura do mês (cartão e valor). */}
                  <div
                    role="radiogroup"
                    aria-labelledby="link-invoice-label"
                    className="flex flex-wrap gap-1.5"
                  >
                    {panel.invoices.map((invoice) => {
                      const card = shared.creditCards.find(
                        (creditCard) => creditCard.id === invoice.creditCardId
                      )
                      const selected = transactionLinking.selectedInvoiceId === invoice.id

                      return (
                        <button
                          key={invoice.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => transactionLinking.setSelectedInvoiceId(invoice.id)}
                          className={`inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition sm:px-3.5 ${
                            selected
                              ? "border-primary/40 bg-primary/12 text-primary"
                              : "border-border bg-card/85 text-foreground hover:border-primary/40 hover:text-primary"
                          }`}
                        >
                          <CreditCardIcon size={15} className="shrink-0" aria-hidden="true" />
                          <span className="truncate">{card?.name || "Fatura"}</span>
                          <span
                            className={`shrink-0 tabular-nums ${selected ? "" : "text-muted-foreground"}`}
                          >
                            {formatCurrency(invoice.amount)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
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
}, samePanelData)
