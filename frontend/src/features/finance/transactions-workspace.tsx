import { ArrowRight, CheckCircle2, GripVertical, Pencil, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { Combobox } from "@/components/ui/combobox.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { Switch } from "@/components/ui/switch.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import {
  usePeriodInvoiceManager,
  useTransactionLinking,
  useTransactionMutations,
} from "@/features/finance/hooks.ts"
import {
  buildTransactionGroups,
  useTransactionReorder,
} from "@/features/finance/transaction-workspace-utils.ts"
import type {
  CreditCard,
  Invoice,
  Period,
  ResponsibleOption,
  Transaction,
  TransactionCategory,
  TransactionFormValues,
} from "@/features/finance/types.ts"
import { formatCurrency, parseCurrencyInput, toneForBalance } from "@/features/finance/utils.ts"
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
})

export function TransactionsWorkspace({
  panel,
  shared,
}: TransactionWorkspaceProps) {
  const composerRef = useRef<HTMLDivElement | null>(null)
  const [form, setForm] = useState<TransactionFormValues>(() =>
    emptyForm(panel.period.id)
  )
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null)
  const [editingScope, setEditingScope] = useState<"SINGLE" | "GROUP">("SINGLE")
  const [formError, setFormError] = useState<string | null>(null)

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

  const scrollToComposerOnMobile = () => {
    if (
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 1279px)").matches
    ) {
      return
    }

    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })
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

    const categoryName = form.categoryName.trim()
    const payload = {
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
  }

  return (
    <Card className="border-border bg-card/90 p-4 shadow-[0_22px_54px_rgba(15,23,42,0.10)] backdrop-blur-xl xl:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-start xl:justify-between">
        <div>
          <p className="app-eyebrow font-bold">{panel.label}</p>
        </div>
        <div className="grid xl:grid-cols-3 items-end gap-2">
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
        <div ref={composerRef}>
          <Card className="border-border bg-secondary/55 p-3 sm:p-4">
          <form
            className="space-y-1"
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
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Supermercado"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <CurrencyInput
                  value={form.amount}
                  onValueChange={(amount) =>
                    setForm((current) => ({ ...current, amount }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as TransactionFormValues["type"],
                    }))
                  }
                >
                  <option value="EXPENSE">Despesa</option>
                  <option value="REVENUE">Receita</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Combobox
                  allowCustomValue
                  options={categoryOptions}
                  preventSubmitOnEnter
                  selectFirstFilteredOptionOnEnter
                  value={form.categoryName}
                  onValueChange={(nextName, matchedCategory) =>
                    setForm((current) => ({
                      ...current,
                      categoryName: nextName,
                      categoryId: matchedCategory?.value || "",
                    }))
                  }
                  placeholder="Digite para buscar ou criar"
                />
              </div>
            </div>

            <div
              className={`grid gap-3 ${editingTransaction
                ? "md:grid-cols-2 xl:grid-cols-3"
                : "md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_20rem_minmax(0,1fr)]"
                }`}
            >
              <div className="flex flex-col gap-2">
                <Label>Responsável</Label>
                <Select
                  value={form.responsibleUserId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      responsibleUserId: event.target.value,
                    }))
                  }
                >
                  <option value="">Geral</option>
                  {shared.responsibleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {!editingTransaction ? (
                <div className="flex items-end">
                  <div className="w-full rounded-xl border border-border bg-card/90 px-3 py-3 xl:py-0">
                    <div className="flex items-center gap-3 xl:flex-nowrap flex-wrap">
                      <Label className="tracking-widest text-[11px]">Recorrente</Label>
                      <div className="flex min-h-11 items-center">
                        <Switch
                          checked={form.isRecurring}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              isRecurring: !current.isRecurring,
                              numberOfPeriods:
                                !current.isRecurring &&
                                  current.numberOfPeriods < 2
                                  ? 2
                                  : current.numberOfPeriods,
                            }))
                          }
                        />
                      </div>
                      {form.isRecurring ? (
                        <div className="flex flex-row items-center gap-2">
                          <Label className="text-[10px] tracking-widest">Períodos</Label>
                          <Input
                            className="h-8 xl:w-full w-20"
                            type="number"
                            min={2}
                            disabled={!form.isRecurring}
                            value={form.numberOfPeriods}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                numberOfPeriods:
                                  Number(event.target.value) || 2,
                              }))
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : editingTransaction.recurringGroupId ? (
                <div>
                  <Label>Aplicar edição</Label>
                  <Select
                    value={editingScope}
                    onChange={(event) =>
                      setEditingScope(event.target.value as "SINGLE" | "GROUP")
                    }
                  >
                    <option value="SINGLE">Somente esta transação</option>
                    <option value="GROUP">Todas do grupo recorrente</option>
                  </Select>
                </div>
              ) : (
                <div className="hidden" />
              )}

              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  className="h-11 flex-1"
                  disabled={
                    createTransaction.isPending ||
                    createRecurringTransaction.isPending ||
                    updateTransaction.isPending
                  }
                >
                  {!editingTransaction ? <Plus size={16} /> : null}
                  {editingTransaction
                    ? updateTransaction.isPending
                      ? "Salvando..."
                      : "Salvar Edição"
                    : form.isRecurring
                      ? createRecurringTransaction.isPending
                        ? "Criando..."
                        : "Criar Recorrência"
                      : createTransaction.isPending
                        ? "Criando..."
                        : "Adicionar Transação"}
                </Button>
                {editingTransaction ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11"
                    onClick={resetComposer}
                  >
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>

            <FormError message={formError || mutationError} />
          </form>
          </Card>
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
              groupedTransactions.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
                    <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
                      {group.label}
                    </p>
                  </div>

                  {group.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      draggable={!reorder.reorderPending}
                      onDragStart={(event) =>
                        reorder.startDrag(transaction, event)
                      }
                      onDragEnd={reorder.endDrag}
                      onDragOver={(event) =>
                        reorder.dragOver(transaction, event)
                      }
                      onDrop={(event) =>
                        reorder.dropOnEntry(transaction, event)
                      }
                      className={`flex flex-col gap-3 rounded-xl border bg-card/95 px-4 py-3 transition sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${reorder.dragOverId === transaction.id
                        ? "border-primary ring-2 ring-primary/15"
                        : "border-border"
                        }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="text-muted-foreground">
                          <GripVertical size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">
                            {transaction.description}{" "}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                              {transaction.category?.name || "Sem categoria"}
                            </span>
                            {transaction.recurringGroupId ? (
                              <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">
                                Recorrente
                              </span>
                            ) : null}
                          </p>
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
                            transaction.type === "EXPENSE" &&
                              transaction.isClearedByInvoice
                              ? "text-emerald-500 dark:text-emerald-400"
                              : undefined
                          }
                          onClick={() =>
                            transactionLinking.openPaymentModal(transaction)
                          }
                          disabled={transaction.type !== "EXPENSE"}
                        >
                          <CheckCircle2 size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTransaction(transaction)
                            setEditingScope("SINGLE")
                            setForm({
                              description: transaction.description,
                              amount: String(
                                Number(transaction.amount || 0).toLocaleString(
                                  "pt-BR",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )
                              ),
                              type: transaction.type,
                              periodId: panel.period.id,
                              responsibleUserId:
                                transaction.responsibleUserId || "",
                              categoryId: transaction.category?.id || "",
                              categoryName: transaction.category?.name || "",
                              isRecurring: false,
                              numberOfPeriods: 2,
                              recurringGroupId:
                                transaction.recurringGroupId || null,
                            })
                            scrollToComposerOnMobile()
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteTransaction.mutate(transaction.id)
                          }
                          disabled={deleteTransaction.isPending}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="app-eyebrow">Faturas</h4>
            {panel.invoices.length > 0 && !invoiceManager.isCreateOpen ? (
              <Button type="button" variant="outline" size="sm" onClick={invoiceManager.startCreate}>
                <Plus size={14} />
                Nova Fatura
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
                    {shared.creditCards.length === 0 ? <option value="">Sem cartões</option> : null}
                    {shared.creditCards.length > 0 ? <option value="">Selecione o cartão</option> : null}
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
                      invoiceManager.setCreateForm((current) => ({ ...current, amount }))
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
                    <Plus size={14} />
                    {invoiceManager.createInvoice.isPending ? "Criando..." : "Criar"}
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
                <p className="text-sm text-muted-foreground">Nenhuma fatura registrada.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={invoiceManager.startCreate}
                >
                  <Plus size={14} />
                  Criar fatura neste mês
                </Button>
              </div>
            ) : (
              panel.invoices.map((invoice) => {
                const card = shared.creditCards.find((item) => item.id === invoice.creditCardId)
                const isEditing = invoiceManager.editingInvoiceId === invoice.id

                return (
                  <div
                    key={invoice.id}
                    className="rounded-xl border border-border bg-card/90 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {card?.name || "Cartão"}
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
                            onClick={() => invoiceManager.updateInvoice.mutate()}
                            disabled={invoiceManager.updateInvoice.isPending}
                          >
                            {invoiceManager.updateInvoice.isPending ? "Salvando..." : "Salvar"}
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
                        <FormError message={invoiceManager.updateErrorMessage} />
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
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
              <h3 className="text-sm font-bold tracking-wider text-foreground uppercase">
                Vincular a fatura
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Transação:{" "}
                <span className="font-semibold text-foreground">
                  {transactionLinking.paymentModalEntry.description}
                </span>
              </p>

              <div className="mt-4 space-y-2">
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
                <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">
                  {transactionLinking.linkTransactionError}
                </p>
              ) : null}

              {panel.invoices.length === 0 ? (
                <p className="mt-2 text-xs text-amber-500 dark:text-amber-400">
                  Nenhuma fatura disponível neste período.
                </p>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
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
