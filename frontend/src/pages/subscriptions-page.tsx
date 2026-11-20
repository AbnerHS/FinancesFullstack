import { useCallback, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  CalendarSync,
  Pencil,
  Plus,
  Power,
  Repeat2,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Combobox } from "@/components/ui/combobox.tsx"
import {
  ConfirmationDialog,
  type ConfirmationDialogState,
} from "@/components/ui/confirmation-dialog.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { getCategoryBadgeStyle } from "@/features/finance/category-colors.ts"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import {
  usePlanContext,
  useRecurringGroups,
  useSubscriptionMutations,
  useSubscriptions,
} from "@/features/finance/hooks.ts"
import type {
  ResponsibleOption,
  Subscription,
  SubscriptionChargeMode,
  SubscriptionPayload,
} from "@/features/finance/types.ts"
import {
  formatCurrency,
  formatCurrencyInput,
  formatMonthLabel,
  parseCurrencyInput,
  todayIso,
} from "@/features/finance/utils.ts"
import { useEscapeKey } from "@/lib/use-escape-key.ts"
import { cn } from "@/lib/utils.ts"

/** "2026-11" → "nov/2026". */
function formatYearMonth(value: string) {
  return `${formatMonthLabel(Number(value.slice(5, 7))).slice(0, 3).toLowerCase()}/${value.slice(0, 4)}`
}

const CHARGE_MODE_LABEL: Record<SubscriptionChargeMode, string> = {
  BILL: "Conta a pagar",
  AUTO: "Débito automático ou cartão",
}

type FormState = {
  id?: string
  name: string
  amount: string
  categoryName: string
  categoryId: string
  responsibleUserId: string
  billingDay: string
  chargeMode: SubscriptionChargeMode
  startMonth: string
  endMonth: string
}

const emptyForm = (): FormState => ({
  name: "",
  amount: "",
  categoryName: "",
  categoryId: "",
  responsibleUserId: "",
  billingDay: String(Number(todayIso().slice(8, 10))),
  chargeMode: "BILL",
  startMonth: todayIso().slice(0, 7),
  endMonth: "",
})

const formFrom = (subscription: Subscription): FormState => ({
  id: subscription.id,
  name: subscription.name,
  amount: formatCurrencyInput(Number(subscription.amount).toFixed(2)),
  categoryName: subscription.category?.name ?? "",
  categoryId: subscription.category?.id ?? "",
  responsibleUserId: subscription.responsibleUserId ?? "",
  billingDay: String(subscription.billingDay),
  chargeMode: subscription.chargeMode,
  startMonth: subscription.startMonth,
  endMonth: subscription.endMonth ?? "",
})

/**
 * Assinaturas do plano: contas mensais sem fim fixo (streaming, academia, telefone...). Cada mês
 * ganha a cobrança automaticamente; mudar o preço vale a partir do mês atual.
 */
export function SubscriptionsPage() {
  const { activePlan, transactionCategories, responsibleOptions } = usePlanContext()
  const planId = activePlan?.id
  const { data: subscriptions = [], isLoading } = useSubscriptions(planId)
  const { data: recurringGroups = [] } = useRecurringGroups(planId)
  const mutations = useSubscriptionMutations(planId)
  const [form, setForm] = useState<FormState | null>(null)
  const [confirmation, setConfirmation] = useState<ConfirmationDialogState | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const closeForm = useCallback(() => setForm(null), [setForm])
  const thisMonth = todayIso().slice(0, 7)

  const active = subscriptions.filter((subscription) => subscription.active)
  const ended = subscriptions.filter((subscription) => !subscription.active)
  const monthlyTotal = active.reduce((total, subscription) => total + Number(subscription.amount), 0)
  const responsibleLabel = (id?: string | null) =>
    responsibleOptions.find((option) => option.id === id)?.label ?? "Geral"
  const categoryOptions = useMemo(
    () => transactionCategories.map((category) => ({ label: category.name, value: category.id })),
    [transactionCategories]
  )

  if (!activePlan) {
    return (
      <section className="app-panel">
        <p className="text-sm text-muted-foreground">Crie ou escolha um plano para gerenciar assinaturas.</p>
      </section>
    )
  }

  const askEnd = (subscription: Subscription) =>
    setConfirmation({
      eyebrow: "Encerrar",
      title: `Encerrar ${subscription.name}?`,
      description: `A cobrança de ${formatYearMonth(thisMonth)} é a última. As cobranças pendentes dos meses seguintes serão removidas; o histórico fica.`,
      confirmLabel: "Encerrar",
      onConfirm: () => mutations.setEndMonth.mutate({ subscription, endMonth: thisMonth }),
    })

  const askDelete = (subscription: Subscription) =>
    setConfirmation({
      title: `Excluir ${subscription.name}?`,
      description:
        "A assinatura e as cobranças pendentes a partir deste mês serão removidas. As cobranças passadas continuam no histórico, sem vínculo com a assinatura.",
      confirmLabel: "Excluir assinatura",
      onConfirm: () => mutations.remove.mutate(subscription),
    })

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="app-eyebrow">Assinaturas</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">Contas que se repetem todo mês</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Cada mês ganha a cobrança automaticamente, sem data para acabar. Mudar o valor vale a partir
              deste mês; encerrar remove as cobranças futuras.
            </p>
          </div>
          <Button type="button" onClick={() => setForm(emptyForm())}>
            <Plus size={16} />
            Nova assinatura
          </Button>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl">
          <SummaryStat label="Por mês" value={formatCurrency(monthlyTotal)} />
          <SummaryStat label="Por ano" value={formatCurrency(monthlyTotal * 12)} />
          <SummaryStat label="Ativas" value={String(active.length)} />
        </dl>
        {notice ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
        <div className="mt-3 empty:hidden">
          <FormError message={mutations.errorMessage} />
        </div>
      </section>

      <section className="app-panel p-0">
        <div className="border-b border-border/70 px-4 py-3 sm:px-5">
          <h3 className="app-eyebrow">Ativas</h3>
        </div>
        {isLoading ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Carregando assinaturas...</p>
        ) : active.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            Nenhuma assinatura ativa. Crie uma ou transforme uma recorrência abaixo.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {active.map((subscription) => (
              <SubscriptionRow
                key={subscription.id}
                subscription={subscription}
                responsible={responsibleLabel(subscription.responsibleUserId)}
                thisMonth={thisMonth}
                onEdit={() => setForm(formFrom(subscription))}
                onEnd={() => askEnd(subscription)}
                onDelete={() => askDelete(subscription)}
              />
            ))}
          </ul>
        )}
      </section>

      {recurringGroups.length > 0 ? (
        <section className="app-panel p-0">
          <div className="border-b border-border/70 px-4 py-3 sm:px-5">
            <h3 className="app-eyebrow">Recorrências que podem virar assinatura</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              A recorrência tem um número fixo de meses; como assinatura, ela segue sem fim e o preço muda num
              lugar só. As ocorrências já lançadas são aproveitadas.
            </p>
          </div>
          <ul className="divide-y divide-border/70">
            {recurringGroups.map((group) => (
              <li key={group.recurringGroupId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Repeat2 size={16} className="shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{group.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.occurrences} {group.occurrences === 1 ? "ocorrência" : "ocorrências"} ·{" "}
                    {formatYearMonth(group.firstMonth)} a {formatYearMonth(group.lastMonth)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                  {formatCurrency(group.amount)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={mutations.fromRecurring.isPending}
                  onClick={() =>
                    mutations.fromRecurring.mutate(group.recurringGroupId, {
                      onSuccess: (created) => setNotice(`"${created.name}" agora é uma assinatura.`),
                    })
                  }
                >
                  <CalendarSync size={14} />
                  Transformar em assinatura
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ended.length > 0 ? (
        <section className="app-panel p-0">
          <div className="border-b border-border/70 px-4 py-3 sm:px-5">
            <h3 className="app-eyebrow">Encerradas</h3>
          </div>
          <ul className="divide-y divide-border/70">
            {ended.map((subscription) => (
              <SubscriptionRow
                key={subscription.id}
                subscription={subscription}
                responsible={responsibleLabel(subscription.responsibleUserId)}
                thisMonth={thisMonth}
                onEdit={() => setForm(formFrom(subscription))}
                onReactivate={() => mutations.setEndMonth.mutate({ subscription, endMonth: null })}
                onDelete={() => askDelete(subscription)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {form ? (
        <SubscriptionFormDialog
          form={form}
          setForm={setForm}
          categoryOptions={categoryOptions}
          responsibleOptions={responsibleOptions}
          pending={mutations.save.isPending}
          errorMessage={mutations.save.error ? mutations.errorMessage : null}
          onClose={closeForm}
          onSubmit={(payload) =>
            mutations.save.mutate(
              { id: form.id, payload },
              {
                onSuccess: (saved) => {
                  setNotice(form.id ? `"${saved.name}" atualizada.` : `"${saved.name}" criada.`)
                  closeForm()
                },
              }
            )
          }
        />
      ) : null}

      <ConfirmationDialog state={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2">
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold text-foreground tabular-nums sm:text-lg">{value}</dd>
    </div>
  )
}

function SubscriptionRow({
  subscription,
  responsible,
  thisMonth,
  onEdit,
  onEnd,
  onReactivate,
  onDelete,
}: {
  subscription: Subscription
  responsible: string
  thisMonth: string
  onEdit: () => void
  onEnd?: () => void
  onReactivate?: () => void
  onDelete: () => void
}) {
  const categoryLabel = subscription.category?.name || "Sem categoria"
  const endsLater = subscription.endMonth && subscription.endMonth >= thisMonth
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5", !subscription.active && "opacity-70")}>
      <CalendarSync size={18} className="shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{subscription.name}</p>
          <span className="rounded px-1.5 text-[11px] font-medium" style={getCategoryBadgeStyle(categoryLabel)}>
            {categoryLabel}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Todo dia {subscription.billingDay} · {CHARGE_MODE_LABEL[subscription.chargeMode]} · {responsible}
          {subscription.endMonth
            ? ` · ${endsLater ? "até" : "encerrada em"} ${formatYearMonth(subscription.endMonth)}`
            : ` · desde ${formatYearMonth(subscription.startMonth)}`}
        </p>
      </div>
      <p className="text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
        {formatCurrency(subscription.amount)}
        <span className="text-xs font-normal text-muted-foreground">/mês</span>
      </p>
      <div className="flex items-center">
        <Button type="button" variant="ghost" size="icon" className="size-9" onClick={onEdit} aria-label={`Editar ${subscription.name}`} title="Editar">
          <Pencil size={15} />
        </Button>
        {onEnd ? (
          <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground" onClick={onEnd} aria-label={`Encerrar ${subscription.name}`} title="Encerrar depois deste mês">
            <Power size={15} />
          </Button>
        ) : null}
        {onReactivate ? (
          <Button type="button" variant="ghost" size="icon" className="size-9 text-emerald-600 dark:text-emerald-400" onClick={onReactivate} aria-label={`Reativar ${subscription.name}`} title="Reativar a partir deste mês">
            <RotateCcw size={15} />
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="icon" className="size-9 text-rose-600 dark:text-rose-400" onClick={onDelete} aria-label={`Excluir ${subscription.name}`} title="Excluir">
          <Trash2 size={15} />
        </Button>
      </div>
    </li>
  )
}

function SubscriptionFormDialog({
  form,
  setForm,
  categoryOptions,
  responsibleOptions,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState | null>>
  categoryOptions: Array<{ label: string; value: string }>
  responsibleOptions: ResponsibleOption[]
  pending: boolean
  errorMessage: string | null
  onClose: () => void
  onSubmit: (payload: SubscriptionPayload) => void
}) {
  const [localError, setLocalError] = useState<string | null>(null)
  useEscapeKey(true, onClose)
  const update = (patch: Partial<FormState>) => setForm((current) => (current ? { ...current, ...patch } : current))

  const submit = () => {
    const amount = parseCurrencyInput(form.amount)
    const billingDay = Number(form.billingDay)
    if (!form.name.trim()) return setLocalError("Informe o nome da assinatura.")
    if (Number.isNaN(amount) || amount <= 0) return setLocalError("Informe um valor válido.")
    if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) {
      return setLocalError("O dia da cobrança vai de 1 a 31.")
    }
    if (!/^\d{4}-\d{2}$/.test(form.startMonth)) return setLocalError("Informe o mês de início.")
    if (form.endMonth && !/^\d{4}-\d{2}$/.test(form.endMonth)) return setLocalError("Mês de encerramento inválido.")
    setLocalError(null)
    const categoryName = form.categoryName.trim()
    onSubmit({
      name: form.name.trim(),
      amount,
      category: categoryName ? (form.categoryId ? { id: form.categoryId } : { name: categoryName }) : null,
      responsibleUserId: form.responsibleUserId || null,
      billingDay,
      chargeMode: form.chargeMode,
      startMonth: form.startMonth,
      endMonth: form.endMonth || null,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={form.id ? "Editar assinatura" : "Nova assinatura"}
        onClick={(event) => event.stopPropagation()}
        className="grid max-h-[92dvh] w-full max-w-xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-2xl border border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
          <p className="app-eyebrow">{form.id ? "Editar assinatura" : "Nova assinatura"}</p>
          <Button type="button" variant="ghost" size="icon" className="size-9" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </Button>
        </div>

        <form
          id="subscription-form"
          className="grid gap-3 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="subscription-name">Nome</Label>
            <Input id="subscription-name" value={form.name} onChange={(event) => update({ name: event.target.value })} placeholder="Ex.: Netflix" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Valor por mês</Label>
            <CurrencyInput value={form.amount} onValueChange={(amount) => update({ amount })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscription-day">Dia da cobrança</Label>
            <Input
              id="subscription-day"
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={form.billingDay}
              onChange={(event) => update({ billingDay: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Combobox
              allowCustomValue
              options={categoryOptions}
              preventSubmitOnEnter
              selectFirstFilteredOptionOnEnter
              value={form.categoryName}
              onValueChange={(categoryName, match) => update({ categoryName, categoryId: match?.value ?? "" })}
              placeholder="Digite para buscar ou criar"
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={form.responsibleUserId} onChange={(event) => update({ responsibleUserId: event.target.value })}>
              <option value="">Geral</option>
              {responsibleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Como é cobrada</Label>
            <Select value={form.chargeMode} onChange={(event) => update({ chargeMode: event.target.value as SubscriptionChargeMode })}>
              <option value="BILL">Conta a pagar (gera vencimento)</option>
              <option value="AUTO">Débito automático ou cartão (sem vencimento)</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscription-start">Começa em</Label>
            <Input id="subscription-start" type="month" value={form.startMonth} onChange={(event) => update({ startMonth: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subscription-end">Termina em (opcional)</Label>
            <Input id="subscription-end" type="month" value={form.endMonth} onChange={(event) => update({ endMonth: event.target.value })} />
          </div>
          {form.id ? (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              As mudanças valem para as cobranças pendentes a partir deste mês. Meses passados e cobranças já
              pagas ficam como estão.
            </p>
          ) : null}
        </form>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-5 sm:pb-3">
          <div className="mr-auto empty:hidden">
            <FormError message={localError || errorMessage} />
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="subscription-form" disabled={pending}>
            {pending ? "Salvando..." : form.id ? "Salvar" : "Criar assinatura"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
