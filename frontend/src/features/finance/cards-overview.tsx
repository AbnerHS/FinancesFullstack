import { useMemo, useState } from "react"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard as CreditCardIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import {
  ConfirmationDialog,
  type ConfirmationDialogState,
} from "@/components/ui/confirmation-dialog.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { FormDialog } from "@/components/ui/form-dialog.tsx"
import { Label } from "@/components/ui/label.tsx"
import { PillGroup } from "@/components/ui/pill-group.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import { DueDayPicker } from "@/features/finance/due-day-picker.tsx"
import { MonthPickerDialog } from "@/features/finance/month-picker.tsx"
import {
  useCreditCardManager,
  useInvoiceManager,
  useInvoiceTransactions,
  usePlanInvoices,
} from "@/features/finance/hooks.ts"
import type {
  CreditCard,
  Invoice,
  Period,
  ResponsibleOption,
} from "@/features/finance/types.ts"
import {
  formatCurrency,
  formatDateOnly,
  formatMonthLabel,
  todayIso,
} from "@/features/finance/utils.ts"
import { getErrorMessage } from "@/lib/errors.ts"
import { cn } from "@/lib/utils"

/** Quantas faturas cada cartão mostra antes de "Mostrar todas". */
const VISIBLE_INVOICES = 6

const monthLabel = (referenceMonth: string) =>
  `${formatMonthLabel(Number(referenceMonth.slice(5, 7)))}/${referenceMonth.slice(0, 4)}`

const shortDate = (date: string) => formatDateOnly(date).slice(0, 5)

/**
 * Tela de cartões: as faturas do plano agrupadas por cartão, cada uma com as contas vinculadas.
 * Criar cartão e criar fatura abrem em janelas, para a lista ficar em primeiro plano.
 */
export function CardsOverview({
  planId,
  creditCards,
  userId,
  responsibleOptions,
  periods,
  preferredMonthId,
}: {
  planId: string | null
  /** Cartões dos participantes do plano. */
  creditCards: CreditCard[]
  userId: string | null
  responsibleOptions: ResponsibleOption[]
  periods: Period[]
  preferredMonthId: string | null
}) {
  const invoicesQuery = usePlanInvoices(planId)
  const cardManager = useCreditCardManager({ userId })
  const [cardDialogOpen, setCardDialogOpen] = useState(false)
  const [invoiceDialogCardId, setInvoiceDialogCardId] = useState<string | null>(null)
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)

  const invoicesByCard = useMemo(() => {
    const map = new Map<string, Invoice[]>()
    for (const invoice of invoicesQuery.data ?? []) {
      const list = map.get(invoice.creditCardId) ?? []
      list.push(invoice)
      map.set(invoice.creditCardId, list)
    }
    // Mais recentes primeiro.
    for (const list of map.values()) {
      list.sort((a, b) => b.referenceMonth.localeCompare(a.referenceMonth))
    }
    return map
  }, [invoicesQuery.data])

  const ownerLabel = (card: CreditCard) =>
    card.userId === userId
      ? null
      : (responsibleOptions.find((option) => option.id === card.userId)?.label ?? null)

  const openCreateCard = () => {
    cardManager.startCreate()
    setCardDialogOpen(true)
  }
  const openEditCard = (card: CreditCard) => {
    cardManager.startEdit(card)
    setCardDialogOpen(true)
  }
  const closeCardDialog = () => {
    cardManager.cancelEdit()
    setCardDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 border-border bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="app-eyebrow">Cartões e faturas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Abra uma fatura para ver as contas vinculadas a ela.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 sm:flex-none"
            onClick={() => setInvoiceDialogCardId("")}
            disabled={creditCards.length === 0}
          >
            <Plus size={16} />
            Nova fatura
          </Button>
          <Button type="button" className="h-10 flex-1 sm:flex-none" onClick={openCreateCard}>
            <Plus size={16} />
            Novo cartão
          </Button>
        </div>
      </Card>

      {cardManager.deleteMutation.error ? (
        <FormError
          message={getErrorMessage(
            cardManager.deleteMutation.error,
            "Não foi possível excluir o cartão."
          )}
        />
      ) : null}
      {invoicesQuery.error ? (
        <FormError
          message={getErrorMessage(invoicesQuery.error, "Não foi possível carregar as faturas.")}
        />
      ) : null}

      {creditCards.length === 0 ? (
        <Card className="border-border bg-secondary/60 p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
          <Button type="button" className="mt-3" onClick={openCreateCard}>
            <Plus size={16} />
            Cadastrar cartão
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {creditCards.map((card) => (
            <CardSection
              key={card.id}
              card={card}
              owner={ownerLabel(card)}
              canManage={card.userId === userId}
              invoices={invoicesByCard.get(card.id) ?? []}
              loading={invoicesQuery.isLoading}
              onNewInvoice={() => setInvoiceDialogCardId(card.id)}
              onEdit={() => openEditCard(card)}
              onDelete={() =>
                setConfirmationDialog({
                  confirmLabel: "Excluir Cartão",
                  title: "Excluir cartão?",
                  description: `O cartão "${card.name}" será removido. Cartões com faturas lançadas não podem ser excluídos: exclua as faturas antes.`,
                  onConfirm: () => cardManager.deleteMutation.mutate(card),
                })
              }
            />
          ))}
        </div>
      )}

      <FormDialog
        open={cardDialogOpen}
        title={cardManager.isEditing ? "Editar cartão" : "Novo cartão"}
        onClose={closeCardDialog}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            cardManager.saveMutation.mutate(undefined, {
              onSuccess: () => setCardDialogOpen(false),
            })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="card-name">Nome</Label>
            <Input
              id="card-name"
              autoFocus
              value={cardManager.form.name}
              onChange={(event) =>
                cardManager.setForm({ ...cardManager.form, name: event.target.value })
              }
              placeholder="Ex.: Nubank"
            />
          </div>
          <DueDayPicker
            id="card-due-day"
            value={cardManager.form.dueDay}
            onChange={(dueDay) => cardManager.setForm({ ...cardManager.form, dueDay })}
            hint={(day) =>
              day
                ? `Cada fatura vence no dia ${day} do mês seguinte (a de outubro, em novembro), ou no último dia se o mês for mais curto. Vale para todas as faturas deste cartão.`
                : "Sem dia, as faturas ficam sem vencimento e não entram em Contas a pagar."
            }
          />
          <FormError
            message={
              cardManager.saveMutation.error
                ? getErrorMessage(cardManager.saveMutation.error, "Não foi possível salvar o cartão.")
                : null
            }
          />
          <DialogActions
            pending={cardManager.saveMutation.isPending}
            submitLabel={cardManager.isEditing ? "Salvar" : "Criar cartão"}
            onCancel={closeCardDialog}
          />
        </form>
      </FormDialog>

      {invoiceDialogCardId !== null ? (
        <InvoiceFormDialog
          planId={planId}
          creditCards={creditCards}
          periods={periods}
          preferredMonthId={preferredMonthId}
          initialCardId={invoiceDialogCardId}
          onClose={() => setInvoiceDialogCardId(null)}
        />
      ) : null}

      <ConfirmationDialog
        onClose={() => setConfirmationDialog(null)}
        state={confirmationDialog}
      />
    </div>
  )
}

function CardSection({
  card,
  owner,
  canManage,
  invoices,
  loading,
  onNewInvoice,
  onEdit,
  onDelete,
}: {
  card: CreditCard
  owner: string | null
  canManage: boolean
  invoices: Invoice[]
  loading: boolean
  onNewInvoice: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [showAll, setShowAll] = useState(false)
  // Começa aberta a fatura do mês atual (ou a mais recente até ele).
  const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined)
  const currentMonth = todayIso().slice(0, 7)
  const defaultInvoice =
    invoices.find((invoice) => invoice.referenceMonth <= currentMonth) ?? invoices[0]
  const openId = expandedId === undefined ? (defaultInvoice?.id ?? null) : expandedId
  const visible = showAll ? invoices : invoices.slice(0, VISIBLE_INVOICES)
  // A pagar: faturas com vencimento ainda não pagas (sem vencimento não há cobrança a acompanhar).
  const openAmount = invoices
    .filter((invoice) => invoice.dueDate && invoice.paymentStatus !== "PAID")
    .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0)

  return (
    <Card className="border-border bg-secondary/60 p-0">
      <div className="flex items-start gap-3 border-b border-border/70 px-4 py-3">
        <span className="mt-0.5 rounded-full bg-primary/12 p-2 text-primary">
          <CreditCardIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">{card.name}</p>
          <p className="text-xs text-muted-foreground">
            {owner ? `De ${owner} · ` : ""}
            {card.dueDay ? `Vence dia ${card.dueDay} · ` : ""}
            {invoices.length} {invoices.length === 1 ? "fatura" : "faturas"}
            {openAmount > 0 ? ` · ${formatCurrency(openAmount)} a pagar` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground"
            onClick={onNewInvoice}
            aria-label={`Nova fatura do ${card.name}`}
            title="Nova fatura"
          >
            <Plus size={16} />
          </Button>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground"
                onClick={onEdit}
                aria-label={`Editar cartão ${card.name}`}
                title="Editar cartão"
              >
                <Pencil size={15} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                onClick={onDelete}
                aria-label={`Excluir cartão ${card.name}`}
                title="Excluir cartão"
              >
                <Trash2 size={15} />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Carregando faturas...</p>
      ) : invoices.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Nenhuma fatura deste cartão no plano.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {visible.map((invoice) => (
            <InvoiceItem
              key={invoice.id}
              invoice={invoice}
              expanded={openId === invoice.id}
              onToggle={() => setExpandedId(openId === invoice.id ? null : invoice.id)}
            />
          ))}
        </ul>
      )}

      {invoices.length > VISIBLE_INVOICES ? (
        <button
          type="button"
          className="w-full border-t border-border/70 px-4 py-2.5 text-sm font-medium text-primary hover:bg-secondary/60"
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? "Mostrar menos" : `Mostrar todas (${invoices.length})`}
        </button>
      ) : null}
    </Card>
  )
}

function InvoiceStatus({ invoice }: { invoice: Invoice }) {
  if (invoice.paymentStatus === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={12} />
        {invoice.paymentDate ? `Paga ${shortDate(invoice.paymentDate)}` : "Paga"}
      </span>
    )
  }
  if (!invoice.dueDate) {
    return <span className="text-muted-foreground">Em aberto</span>
  }
  const overdue = invoice.dueDate < todayIso()
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        overdue ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      {overdue ? <AlertTriangle size={12} /> : <Clock3 size={12} />}
      {overdue ? "Venceu" : "Vence"} {shortDate(invoice.dueDate)}
    </span>
  )
}

function InvoiceItem({
  invoice,
  expanded,
  onToggle,
}: {
  invoice: Invoice
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-secondary/60"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground capitalize">
            {monthLabel(invoice.referenceMonth)}
          </span>
          <span className="block text-[11px] leading-4">
            <InvoiceStatus invoice={invoice} />
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
          {formatCurrency(invoice.amount)}
        </span>
      </button>
      {expanded ? <InvoiceTransactions invoice={invoice} /> : null}
    </li>
  )
}

/** Contas vinculadas à fatura, com a soma e a diferença para o valor da fatura. */
function InvoiceTransactions({ invoice }: { invoice: Invoice }) {
  const { data: transactions = [], isLoading, error } = useInvoiceTransactions(invoice.id)
  const linkedTotal = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  )
  const difference = Number(invoice.amount || 0) - linkedTotal

  if (isLoading) {
    return <p className="px-4 pb-3 pl-10 text-xs text-muted-foreground">Carregando contas...</p>
  }
  if (error) {
    return (
      <div className="px-4 pb-3 pl-10">
        <FormError message={getErrorMessage(error, "Não foi possível carregar as contas.")} />
      </div>
    )
  }
  if (transactions.length === 0) {
    return (
      <p className="px-4 pb-3 pl-10 text-xs text-muted-foreground">
        Nenhuma conta vinculada. Para vincular, use o ícone de corrente na transação, no painel do
        mês.
      </p>
    )
  }

  return (
    <div className="bg-background/40 px-4 pt-1 pb-3 pl-10">
      <ul className="divide-y divide-border/50">
        {transactions.map((transaction) => (
          <li key={transaction.id} className="flex items-center gap-3 py-1.5 text-sm">
            <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
              {shortDate(transaction.referenceDate)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-foreground">{transaction.description}</span>
              {transaction.category?.name ? (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {transaction.category.name}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums text-foreground">
              {formatCurrency(transaction.amount)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 border-t border-border/70 pt-2 text-xs text-muted-foreground">
        <span>
          {transactions.length} {transactions.length === 1 ? "conta" : "contas"} ·{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(linkedTotal)}
          </span>
        </span>
        {Math.abs(difference) >= 0.01 ? (
          <span title="Valor da fatura menos a soma das contas vinculadas">
            {difference > 0 ? "Sem conta lançada" : "Acima da fatura"}:{" "}
            <span className="tabular-nums">{formatCurrency(Math.abs(difference))}</span>
          </span>
        ) : (
          <span className="text-emerald-600 dark:text-emerald-400">Bate com a fatura</span>
        )}
      </div>
    </div>
  )
}

function InvoiceFormDialog({
  planId,
  creditCards,
  periods,
  preferredMonthId,
  initialCardId,
  onClose,
}: {
  planId: string | null
  creditCards: CreditCard[]
  periods: Period[]
  preferredMonthId: string | null
  /** "" = o primeiro cartão. */
  initialCardId: string
  onClose: () => void
}) {
  const { form, setForm, createInvoice, errorMessage } = useInvoiceManager({
    creditCards,
    periods,
    selectedPeriodIds: preferredMonthId ? [preferredMonthId] : [],
    // Aberta pelo "+" de um cartão: já vem com ele escolhido.
    initialCardId,
    // Com o plano, o mês pode ser qualquer um (seletor em grade), não só os que já têm dados.
    planId,
  })
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)

  return (
    <FormDialog open title="Nova fatura" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          createInvoice.mutate(undefined, { onSuccess: onClose })
        }}
      >
        <PillGroup
          id="invoice-card"
          label="Cartão"
          value={form.creditCardId}
          options={creditCards.map((card) => ({
            value: card.id,
            label: card.name || "Cartão",
            icon: CreditCardIcon,
          }))}
          onChange={(creditCardId) => setForm((current) => ({ ...current, creditCardId }))}
        />
        <div className="space-y-2">
          <Label id="invoice-month-label">Mês</Label>
          <button
            type="button"
            aria-labelledby="invoice-month-label"
            onClick={() => setMonthPickerOpen(true)}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card/90 px-3 text-left text-sm font-medium text-foreground transition hover:border-primary/40"
          >
            <span className="flex items-center gap-2 capitalize">
              <CalendarDays size={16} className="shrink-0 text-primary" aria-hidden="true" />
              {form.periodId ? monthLabel(form.periodId) : "Escolher mês"}
            </span>
            <ChevronDown size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
          <MonthPickerDialog
            open={monthPickerOpen}
            value={form.periodId || todayIso().slice(0, 7)}
            monthsWithData={periods.map((period) => period.id)}
            onSelect={(periodId) => setForm((current) => ({ ...current, periodId }))}
            onClose={() => setMonthPickerOpen(false)}
          />
        </div>
        <div className="space-y-2">
          <Label>Valor</Label>
          <CurrencyInput
            value={form.amount}
            onValueChange={(nextValue) =>
              setForm((current) => ({ ...current, amount: nextValue }))
            }
          />
        </div>
        <FormError message={errorMessage} />
        <DialogActions
          pending={createInvoice.isPending}
          submitLabel="Criar fatura"
          onCancel={onClose}
        />
      </form>
    </FormDialog>
  )
}

function DialogActions({
  pending,
  submitLabel,
  onCancel,
}: {
  pending: boolean
  submitLabel: string
  onCancel: () => void
}) {
  return (
    <div className="flex gap-2 pt-1">
      <Button type="submit" className="h-11 flex-1" disabled={pending}>
        {pending ? "Salvando..." : submitLabel}
      </Button>
      <Button type="button" variant="outline" className="h-11" onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  )
}
