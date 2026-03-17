import { CheckCircle2, GripVertical, Pencil, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { Switch } from "@/components/ui/switch.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import { useTransactionLinking, useTransactionMutations } from "@/features/finance/hooks.ts"
import {
  buildTransactionGroups,
  useTransactionReorder,
} from "@/features/finance/transaction-workspace-utils.ts"
import type {
  CreditCard,
  Period,
  ResponsibleOption,
  Transaction,
  TransactionCategory,
  TransactionFormValues,
} from "@/features/finance/types.ts"
import { formatCurrency, parseCurrencyInput } from "@/features/finance/utils.ts"
import { getErrorMessage } from "@/lib/errors.ts"

type TransactionWorkspaceProps = {
  panel: {
    period: Period
    label: string
    transactions: Transaction[]
    invoices: Array<{ id: string; amount: number | string; creditCardId: string }>
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
  isRecurring: false,
  numberOfPeriods: 2,
  recurringGroupId: null,
})

export function TransactionsWorkspace({ panel, shared }: TransactionWorkspaceProps) {
  const [form, setForm] = useState<TransactionFormValues>(() => emptyForm(panel.period.id))
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingScope, setEditingScope] = useState<"SINGLE" | "GROUP">("SINGLE")

  const { createTransaction, createRecurringTransaction, updateTransaction, deleteTransaction } =
    useTransactionMutations(panel.period.id, shared.periods)
  const transactionLinking = useTransactionLinking(panel.period.id)

  const reorder = useTransactionReorder({
    activePeriodId: panel.period.id,
    transactions: panel.transactions,
  })

  const groupedTransactions = useMemo(
    () => buildTransactionGroups(reorder.transactions, shared.responsibleOptions),
    [reorder.transactions, shared.responsibleOptions]
  )

  const mutationError = useMemo(() => {
    if (createTransaction.error) {
      return getErrorMessage(createTransaction.error, "Nao foi possivel salvar a transacao.")
    }
    if (createRecurringTransaction.error) {
      return getErrorMessage(
        createRecurringTransaction.error,
        "Nao foi possivel criar a recorrencia."
      )
    }
    if (updateTransaction.error) {
      return getErrorMessage(updateTransaction.error, "Nao foi possivel atualizar a transacao.")
    }
    if (deleteTransaction.error) {
      return getErrorMessage(deleteTransaction.error, "Nao foi possivel remover a transacao.")
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
    setForm(emptyForm(panel.period.id))
  }

  const submit = async () => {
    const amount = parseCurrencyInput(form.amount)
    if (!form.description.trim()) {
      throw new Error("Informe a descricao.")
    }
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error("Informe um valor valido.")
    }

    const payload = {
      description: form.description.trim(),
      amount,
      type: form.type,
      periodId: panel.period.id,
      responsibleUserId: form.responsibleUserId || null,
      category: form.categoryId ? { id: form.categoryId } : null,
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
        throw new Error("Informe pelo menos 2 periodos para recorrencia.")
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
    <Card className="border-border bg-card/90 p-5 shadow-[0_22px_54px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">{panel.label}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Receitas, despesas e leitura rapida do periodo selecionado.
          </p>
        </div>
        <div className="grid gap-2 text-right text-sm">
          <span className="text-emerald-500 dark:text-emerald-400">
            Receitas: {formatCurrency(panel.stats.incomes)}
          </span>
          <span className="text-rose-500 dark:text-rose-400">
            Despesas: {formatCurrency(panel.stats.expenses)}
          </span>
          <span
            className={`font-semibold ${
              panel.stats.balance > 0
                ? "text-emerald-500 dark:text-emerald-400"
                : "text-rose-500 dark:text-rose-400"
            }`}
          >
            Saldo: {formatCurrency(panel.stats.balance)}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <Card className="border-border bg-secondary/55 p-4">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              await submit()
            }}
          >
            <div className="grid gap-3 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-1">
                <Label>Descricao</Label>
                <Input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Ex.: Supermercado"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor</Label>
                <CurrencyInput
                  value={form.amount}
                  onValueChange={(amount) => setForm((current) => ({ ...current, amount }))}
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
                <Select
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, categoryId: event.target.value }))
                  }
                >
                  <option value="">Sem categoria</option>
                  {shared.transactionCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className={`grid gap-3 ${editingTransaction ? "grid-cols-3" : "xl:grid-cols-[minmax(0,1fr)_26rem_minmax(0,1fr)]"}`}>
              <div className="space-y-2">
                <Label>Responsavel</Label>
                <Select
                  value={form.responsibleUserId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, responsibleUserId: event.target.value }))
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
                <div className="flex items-end space-y-2">
                  <div className="w-full rounded-xl border border-border bg-card/90 px-3">
                    <div className="flex items-center gap-3">
                      <Label>Recorrente</Label>
                      <div className="flex min-h-11 items-center">
                        <Switch
                          checked={form.isRecurring}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              isRecurring: !current.isRecurring,
                              numberOfPeriods:
                                !current.isRecurring && current.numberOfPeriods < 2
                                  ? 2
                                  : current.numberOfPeriods,
                            }))
                          }
                        />
                      </div>
                      {form.isRecurring ? (
                        <div className="flex flex-row items-center gap-2">
                          <Label>Periodos</Label>
                          <Input
                            className="h-8"
                            type="number"
                            min={2}
                            disabled={!form.isRecurring}
                            value={form.numberOfPeriods}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                numberOfPeriods: Number(event.target.value) || 2,
                              }))
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : editingTransaction.recurringGroupId ? (
                <div className="space-y-2">
                  <Label>Aplicar edicao</Label>
                  <Select
                    value={editingScope}
                    onChange={(event) =>
                      setEditingScope(event.target.value as "SINGLE" | "GROUP")
                    }
                  >
                    <option value="SINGLE">Somente esta transacao</option>
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
                  {editingTransaction
                    ? updateTransaction.isPending
                      ? "Salvando..."
                      : "Salvar edicao"
                    : form.isRecurring
                      ? createRecurringTransaction.isPending
                        ? "Criando..."
                        : "Lancar recorrencia"
                      : createTransaction.isPending
                        ? "Criando..."
                        : "Adicionar transacao"}
                </Button>
                {editingTransaction ? (
                  <Button type="button" variant="outline" className="h-11" onClick={resetComposer}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>

            <FormError message={mutationError} />
          </form>
        </Card>

        <Card className="border-border bg-secondary/40 p-4">
          <h4 className="app-eyebrow">Transacoes por responsavel</h4>
          <div className="mt-3 space-y-4">
            {panel.transactionsLoading ? (
              <p className="text-sm text-muted-foreground">Carregando transacoes...</p>
            ) : groupedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transacao cadastrada.</p>
            ) : (
              groupedTransactions.map((group) => (
                <div key={group.id} className="space-y-2">
                  <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {group.label}
                    </p>
                  </div>

                  {group.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      draggable={!reorder.reorderPending}
                      onDragStart={(event) => reorder.startDrag(transaction, event)}
                      onDragEnd={reorder.endDrag}
                      onDragOver={(event) => reorder.dragOver(transaction, event)}
                      onDrop={(event) => reorder.dropOnEntry(transaction, event)}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-3 transition ${
                        reorder.dragOverId === transaction.id
                          ? "border-primary ring-2 ring-primary/15"
                          : "border-border"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="rounded-lg border border-border bg-secondary/60 p-2 text-muted-foreground">
                          <GripVertical size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">
                            {transaction.description}{" "}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              {transaction.category?.name || "Sem categoria"}
                            </span>
                            {transaction.recurringGroupId ? (
                              <span className="ml-2 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                                Recorrente
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            transaction.type === "REVENUE"
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
                          onClick={() => transactionLinking.openPaymentModal(transaction)}
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
                                Number(transaction.amount || 0).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              ),
                              type: transaction.type,
                              periodId: panel.period.id,
                              responsibleUserId: transaction.responsibleUserId || "",
                              categoryId: transaction.category?.id || "",
                              isRecurring: false,
                              numberOfPeriods: 2,
                              recurringGroupId: transaction.recurringGroupId || null,
                            })
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTransaction.mutate(transaction.id)}
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
          <h4 className="app-eyebrow">Faturas do periodo</h4>
          <div className="mt-3 space-y-2">
            {panel.invoicesLoading ? (
              <p className="text-sm text-muted-foreground">Carregando faturas...</p>
            ) : panel.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura registrada.</p>
            ) : (
              panel.invoices.map((invoice) => {
                const card = shared.creditCards.find((item) => item.id === invoice.creditCardId)
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/90 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {card?.name || "Cartao"}
                      </p>
                      <p className="text-xs text-muted-foreground">Fatura vinculada ao periodo</p>
                    </div>
                    <p className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                      {formatCurrency(invoice.amount)}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {transactionLinking.paymentModalEntry ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Vincular a fatura
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Transacao:{" "}
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
                        {card?.name || "Fatura"} - {formatCurrency(invoice.amount)}
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
                  Nenhuma fatura disponivel neste periodo.
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
                    disabled={transactionLinking.unlinkTransactionFromInvoice.isPending}
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
                  onClick={() => transactionLinking.linkTransactionToInvoice.mutate()}
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
