import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  CalendarSync,
  Minus,
  Plus,
  Receipt,
  Repeat2,
  Save,
  SendHorizonal,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { Combobox } from "@/components/ui/combobox.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { Switch } from "@/components/ui/switch.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import { formatMonthLabel, todayIso } from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"
import { useEscapeKey } from "@/lib/use-escape-key.ts"
import type {
  ResponsibleOption,
  Transaction,
  TransactionFormValues,
} from "@/features/finance/types.ts"

type TransactionComposerProps = {
  isOpen: boolean
  periodLabel: string
  /** Mês do painel (AAAA-MM): início da repetição. */
  periodId: string
  form: TransactionFormValues
  setForm: React.Dispatch<React.SetStateAction<TransactionFormValues>>
  editingTransaction: Transaction | null
  showCancel: boolean
  editingScope: "SINGLE" | "GROUP"
  setEditingScope: React.Dispatch<React.SetStateAction<"SINGLE" | "GROUP">>
  categoryOptions: Array<{ label: string; value: string }>
  responsibleOptions: ResponsibleOption[]
  /** Cartões do plano, para a assinatura cobrada no cartão. */
  cardOptions: Array<{ label: string; value: string }>
  formError: string | null
  mutationError: string | null
  createPending: boolean
  createRecurringPending: boolean
  updatePending: boolean
  submitPending: boolean
  onSubmit: (
    event: React.FormEvent<HTMLFormElement>,
    options: { keepOpen: boolean }
  ) => void | Promise<void>
  onCancel: () => void
  /** Muda a cada "Salvar e adicionar outra": devolve o foco para a descrição. */
  focusSignal?: number
}

type SharedLayoutProps = {
  form: TransactionFormValues
  setForm: React.Dispatch<React.SetStateAction<TransactionFormValues>>
  categoryOptions: Array<{ label: string; value: string }>
  responsibleOptions: ResponsibleOption[]
  cardOptions: Array<{ label: string; value: string }>
  periodId: string
}

type ActionsRowProps = {
  editingTransaction: Transaction | null
  form: TransactionFormValues
  showCancel: boolean
  createPending: boolean
  createRecurringPending: boolean
  updatePending: boolean
  submitPending: boolean
  onCancel: () => void
  formId?: string
}

const CONTINUE_INTENT = "continue"

const fieldClassName = "flex flex-col gap-2"

function updateType(
  setForm: React.Dispatch<React.SetStateAction<TransactionFormValues>>,
  nextType: TransactionFormValues["type"]
) {
  setForm((current) => {
    if (nextType === "REVENUE") {
      return {
        ...current,
        type: nextType,
        hasDueDate: false,
        dueDate: "",
        isPaid: false,
        paymentDate: "",
        billingDocumentType: current.billingDocumentExisting?.type || "NONE",
        billingDocumentUrl:
          current.billingDocumentExisting?.type === "LINK"
            ? current.billingDocumentExisting.url || ""
            : "",
        billingDocumentFile: null,
      }
    }

    return {
      ...current,
      type: nextType,
    }
  })
}

function updateDueDate(
  setForm: React.Dispatch<React.SetStateAction<TransactionFormValues>>,
  nextDueDate: string
) {
  setForm((current) => ({
    ...current,
    dueDate: nextDueDate,
    hasDueDate: Boolean(nextDueDate),
    isPaid: nextDueDate ? current.isPaid : false,
    paymentDate: nextDueDate ? current.paymentDate : "",
    billingDocumentType:
      nextDueDate || current.billingDocumentExisting
        ? current.billingDocumentType
        : "NONE",
    billingDocumentUrl:
      nextDueDate || current.billingDocumentExisting
        ? current.billingDocumentUrl
        : "",
    billingDocumentFile:
      nextDueDate || current.billingDocumentExisting
        ? current.billingDocumentFile
        : null,
  }))
}

function shouldShowBillingDocumentField(form: TransactionFormValues) {
  return Boolean(
    (form.type === "EXPENSE" && form.dueDate) ||
    form.billingDocumentExisting ||
    form.billingDocumentType !== "NONE"
  )
}

function TransactionCommonRow({
  form,
  setForm,
  descriptionRef,
}: Pick<SharedLayoutProps, "form" | "setForm"> & {
  descriptionRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className={fieldClassName}>
        <Label>Descrição</Label>
        <Input
          ref={descriptionRef}
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

      <div className={fieldClassName}>
        <Label>Valor</Label>
        <CurrencyInput
          value={form.amount}
          onValueChange={(amount) =>
            setForm((current) => ({ ...current, amount }))
          }
        />
      </div>

      <div className={fieldClassName}>
        <Label>Tipo</Label>
        <Select
          value={form.type}
          onChange={(event) =>
            updateType(
              setForm,
              event.target.value as TransactionFormValues["type"]
            )
          }
        >
          <option value="EXPENSE">Saída</option>
          <option value="REVENUE">Entrada</option>
        </Select>
      </div>
    </div>
  )
}

function CategoryField({
  form,
  setForm,
  categoryOptions,
}: Pick<SharedLayoutProps, "form" | "setForm" | "categoryOptions">) {
  return (
    <div className={fieldClassName}>
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
  )
}

function ResponsibleField({
  form,
  setForm,
  responsibleOptions,
}: Pick<SharedLayoutProps, "form" | "setForm" | "responsibleOptions">) {
  return (
    <div className={fieldClassName}>
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
        {responsibleOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

function DueDateField({
  form,
  setForm,
}: Pick<SharedLayoutProps, "form" | "setForm">) {
  if (form.type !== "EXPENSE") {
    return null
  }

  return (
    <div className={fieldClassName}>
      <Label>Vencimento</Label>
      <Input
        type="date"
        value={form.dueDate}
        onChange={(event) => updateDueDate(setForm, event.target.value)}
      />
    </div>
  )
}

function PaymentStatusField({
  form,
  setForm,
}: Pick<SharedLayoutProps, "form" | "setForm">) {
  if (form.type !== "EXPENSE" || !form.dueDate) {
    return null
  }

  return (
    <div className={fieldClassName}>
      <Label>Status</Label>
      <div className="flex h-11 items-center justify-between rounded-xl border border-border bg-card px-3">
        <span className="text-sm text-foreground">
          {form.isPaid ? "Pago" : "Pendente"}
        </span>
        <Switch
          checked={form.isPaid}
          onClick={() =>
            setForm((current) => ({
              ...current,
              isPaid: !current.isPaid,
              // Ao marcar como pago, a data padrão é hoje.
              paymentDate: current.isPaid ? "" : current.paymentDate || todayIso(),
            }))
          }
        />
      </div>
    </div>
  )
}

function PaymentDateField({
  form,
  setForm,
}: Pick<SharedLayoutProps, "form" | "setForm">) {
  if (form.type !== "EXPENSE" || !form.dueDate) {
    return null
  }

  return (
    <div className={fieldClassName}>
      <Label>Pagamento</Label>
      <Input
        type="date"
        disabled={!form.isPaid}
        value={form.paymentDate}
        onChange={(event) =>
          setForm((current) => ({
            ...current,
            paymentDate: event.target.value,
          }))
        }
      />
    </div>
  )
}

function BillingDocumentField({
  form,
  setForm,
}: Pick<SharedLayoutProps, "form" | "setForm">) {
  if (!shouldShowBillingDocumentField(form)) {
    return null
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className="space-y-1">
        <Label>Documento para pagamento</Label>
        <p className="text-sm text-muted-foreground">
          Anexe um arquivo ou informe o link direto do documento a ser pago.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <div className={fieldClassName}>
          <Label>Tipo</Label>
          <Select
            value={form.billingDocumentType}
            onChange={(event) =>
              setForm((current) => {
                const nextType = event.target.value as
                  | TransactionFormValues["billingDocumentType"]

                return {
                  ...current,
                  billingDocumentType: nextType,
                  billingDocumentUrl: nextType === "LINK"
                    ? current.billingDocumentType === "LINK"
                      ? current.billingDocumentUrl
                      : current.billingDocumentExisting?.type === "LINK"
                        ? current.billingDocumentExisting.url || ""
                        : ""
                    : "",
                  billingDocumentFile: null,
                }
              })
            }
          >
            <option value="NONE">Nenhum</option>
            <option value="LINK">Link</option>
            <option value="FILE">Arquivo</option>
          </Select>
        </div>

        {form.billingDocumentType === "LINK" ? (
          <div className={fieldClassName}>
            <Label>URL do documento</Label>
            <Input
              type="url"
              value={form.billingDocumentUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  billingDocumentUrl: event.target.value,
                }))
              }
              placeholder="https://..."
            />
          </div>
        ) : form.billingDocumentType === "FILE" ? (
          <div className={fieldClassName}>
            <Label>Arquivo</Label>
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  billingDocumentFile: event.target.files?.[0] || null,
                }))
              }
            />
            {form.billingDocumentFile ? (
              <p className="text-sm text-foreground">
                Novo arquivo: {form.billingDocumentFile.name}
              </p>
            ) : form.billingDocumentExisting?.type === "FILE" ? (
              <p className="text-sm text-muted-foreground">
                Arquivo atual: {form.billingDocumentExisting.fileName || "Documento enviado"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione um arquivo PDF, PNG, JPG, JPEG ou WEBP de at&eacute; 10 MB.
              </p>
            )}
          </div>
        ) : form.billingDocumentExisting ? (
          <div className="flex items-center rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            Documento atual ser&aacute; removido ao salvar.
          </div>
        ) : null}
      </div>
    </div>
  )
}

type RepeatMode = "NONE" | "RECURRING" | "SUBSCRIPTION"

const repeatModeOf = (form: TransactionFormValues): RepeatMode =>
  form.isSubscription && form.type === "EXPENSE"
    ? "SUBSCRIPTION"
    : form.isRecurring
      ? "RECURRING"
      : "NONE"

/**
 * Cobrança: única (só este mês), parcelas (cria todas as ocorrências agora) ou assinatura (despesa mensal
 * sem fim; a cobrança de cada mês é gerada quando o mês chega).
 */
/** Cartão da assinatura: com cartão, cada cobrança entra na fatura do cartão naquele mês. */
function SubscriptionCardField({
  form,
  setForm,
  cardOptions,
}: Pick<SharedLayoutProps, "form" | "setForm" | "cardOptions">) {
  return (
    <div className={fieldClassName}>
      <Label htmlFor="subscription-card">Cobrada no cartão</Label>
      <Select
        id="subscription-card"
        value={form.subscriptionCardId}
        onChange={(event) =>
          setForm((current) => ({ ...current, subscriptionCardId: event.target.value }))
        }
      >
        <option value="">Não (conta ou débito)</option>
        {cardOptions.map((card) => (
          <option key={card.value} value={card.value}>
            {card.label}
          </option>
        ))}
      </Select>
    </div>
  )
}

const MIN_MONTHS = 2
const MAX_MONTHS = 120
const MONTH_PRESETS = [2, 3, 6, 10, 12, 24]

const clampMonths = (value: number) => Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, Math.round(value)))

/** "nov/2026" a partir de AAAA-MM somado a `offset` meses. */
function shortMonth(yearMonth: string, offset: number) {
  const [year, month] = yearMonth.split("-").map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${formatMonthLabel(date.getMonth() + 1).slice(0, 3).toLowerCase()}/${date.getFullYear()}`
}

/** Quantidade de parcelas (uma por mês): − e +, atalhos comuns e o período resultante. */
function MonthsStepper({
  value,
  startMonth,
  onChange,
}: {
  value: number
  startMonth: string
  onChange: (months: number) => void
}) {
  const months = clampMonths(value)

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Label id="transaction-occurrences-label">Quantas parcelas</Label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          role="group"
          aria-labelledby="transaction-occurrences-label"
          className="flex h-11 items-center rounded-xl border border-border bg-card/90"
        >
          <button
            type="button"
            className="flex h-full w-11 items-center justify-center rounded-l-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
            onClick={() => onChange(clampMonths(months - 1))}
            disabled={months <= MIN_MONTHS}
            aria-label="Uma parcela a menos"
          >
            <Minus size={16} />
          </button>
          <span
            className="min-w-[5.75rem] text-center text-sm font-semibold text-foreground tabular-nums"
            aria-live="polite"
          >
            {months} parcelas
          </span>
          <button
            type="button"
            className="flex h-full w-11 items-center justify-center rounded-r-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
            onClick={() => onChange(clampMonths(months + 1))}
            disabled={months >= MAX_MONTHS}
            aria-label="Uma parcela a mais"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Atalhos de parcelas">
          {MONTH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              aria-pressed={months === preset}
              className={cn(
                "h-9 min-w-9 rounded-full border px-3 text-sm font-medium tabular-nums transition",
                months === preset
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border bg-card/85 text-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      {startMonth ? (
        <p className="text-xs text-muted-foreground">
          De {shortMonth(startMonth, 0)} a {shortMonth(startMonth, months - 1)}.
        </p>
      ) : null}
    </div>
  )
}

function RecurrenceField({
  form,
  setForm,
  cardOptions,
  periodId,
}: Pick<SharedLayoutProps, "form" | "setForm" | "cardOptions" | "periodId">) {
  const mode = repeatModeOf(form)
  const cardName = cardOptions.find((card) => card.value === form.subscriptionCardId)?.label

  // Mesmos ícones das linhas de transação: Repeat2 = recorrente/parcelas, CalendarSync = assinatura.
  const options: Array<{ value: RepeatMode; label: string; title: string; icon: LucideIcon }> = [
    { value: "NONE", label: "Única", title: "Só este mês", icon: Receipt },
    {
      value: "RECURRING",
      label: "Parcelas",
      title: "Uma parcela por mês, pela quantidade escolhida",
      icon: Repeat2,
    },
    ...(form.type === "EXPENSE"
      ? [
          {
            value: "SUBSCRIPTION" as const,
            label: "Assinatura",
            title: "Todo mês, sem data para acabar",
            icon: CalendarSync,
          },
        ]
      : []),
  ]
  const choose = (next: RepeatMode) =>
    setForm((current) => ({
      ...current,
      isRecurring: next === "RECURRING",
      isSubscription: next === "SUBSCRIPTION",
      occurrences:
        next === "RECURRING" && current.occurrences < 2 ? 2 : current.occurrences,
    }))

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label id="transaction-repeat-label">Cobrança</Label>
        <div
          id="transaction-repeat"
          role="radiogroup"
          aria-labelledby="transaction-repeat-label"
          className="flex flex-wrap gap-1.5"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mode === option.value}
              title={option.title}
              onClick={() => choose(option.value)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition",
                mode === option.value
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border bg-card/85 text-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              <option.icon size={15} className="shrink-0" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {mode === "RECURRING" ? (
        <MonthsStepper
          value={form.occurrences}
          startMonth={periodId}
          onChange={(occurrences) => setForm((current) => ({ ...current, occurrences }))}
        />
      ) : null}
      {mode === "SUBSCRIPTION" ? (
        <>
          <SubscriptionCardField form={form} setForm={setForm} cardOptions={cardOptions} />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            A cobrança aparece todo mês no mesmo dia
            {form.hasDueDate && form.dueDate ? " da data informada" : ""}, até você encerrar a assinatura.
            {cardName
              ? ` No dia ${form.hasDueDate && form.dueDate ? "do vencimento" : "da cobrança"}, cada mês entra na fatura do ${cardName} daquele mês (quando a fatura existir).`
              : form.hasDueDate && form.dueDate
                ? " Cada mês entra em Contas a pagar."
                : " Sem vencimento, conta como débito automático."}
          </p>
        </>
      ) : null}
    </div>
  )
}

function EditScopeField({
  editingTransaction,
  editingScope,
  setEditingScope,
}: {
  editingTransaction: Transaction | null
  editingScope: "SINGLE" | "GROUP"
  setEditingScope: React.Dispatch<React.SetStateAction<"SINGLE" | "GROUP">>
}) {
  const isSubscription = Boolean(editingTransaction?.subscriptionId)
  if (!editingTransaction?.recurringGroupId && !isSubscription) {
    return null
  }

  return (
    <div className={fieldClassName}>
      <Label>Aplicar edição</Label>
      <Select
        value={editingScope}
        onChange={(event) =>
          setEditingScope(event.target.value as "SINGLE" | "GROUP")
        }
      >
        <option value="SINGLE">
          {isSubscription ? "Somente a cobrança deste mês" : "Somente esta transação"}
        </option>
        <option value="GROUP">
          {isSubscription
            ? "Esta e as próximas cobranças da assinatura"
            : "Todas do grupo recorrente"}
        </option>
      </Select>
    </div>
  )
}

function ActionButtons({
  editingTransaction,
  form,
  showCancel,
  createPending,
  createRecurringPending,
  updatePending,
  submitPending,
  onCancel,
  formId,
}: ActionsRowProps) {
  return (
    <div className="flex flex-wrap items-end gap-2 lg:justify-end">
      <Button
        type="submit"
        form={formId}
        className="h-11 flex-1 lg:min-w-[180px]"
        disabled={
          createPending ||
          createRecurringPending ||
          updatePending ||
          submitPending
        }
      >
        {submitPending
          ? "Salvando..."
          : editingTransaction
            ? updatePending
              ? "Salvando..."
              : "Salvar"
            : repeatModeOf(form) === "SUBSCRIPTION"
              ? createRecurringPending
                ? "Criando..."
                : "Criar Assinatura"
              : form.isRecurring
              ? createRecurringPending
                ? "Criando..."
                : "Criar Parcelas"
              : createPending
                ? "Criando..."
                : "Enviar"}
        {editingTransaction ? <Save size={16} /> : <SendHorizonal size={16} />}
      </Button>
      {!editingTransaction ? (
        <Button
          type="submit"
          form={formId}
          variant="outline"
          className="h-11"
          name="intent"
          value={CONTINUE_INTENT}
          disabled={
            createPending ||
            createRecurringPending ||
            updatePending ||
            submitPending
          }
          title="Salvar e manter o formulário aberto para outra transação"
        >
          <span className="sm:hidden">Salvar e nova</span>
          <span className="hidden sm:inline">Salvar e adicionar outra</span>
        </Button>
      ) : null}
      {showCancel ? (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      ) : null}
    </div>
  )
}

function TransactionCreateFormLayout({
  form,
  setForm,
  categoryOptions,
  responsibleOptions,
  cardOptions,
  periodId,
}: SharedLayoutProps) {
  const secondRowClassName =
    form.type === "EXPENSE"
      ? "grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
      : "grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"

  return (
    <>
      <div className={secondRowClassName}>
        <CategoryField
          form={form}
          setForm={setForm}
          categoryOptions={categoryOptions}
        />
        <ResponsibleField
          form={form}
          setForm={setForm}
          responsibleOptions={responsibleOptions}
        />
        <DueDateField form={form} setForm={setForm} />
      </div>

      {repeatModeOf(form) === "SUBSCRIPTION" ? null : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <BillingDocumentField form={form} setForm={setForm} />
        </div>
      )}

      <RecurrenceField
        form={form}
        setForm={setForm}
        cardOptions={cardOptions}
        periodId={periodId}
      />
    </>
  )
}

function TransactionEditFormLayout({
  form,
  setForm,
  categoryOptions,
  responsibleOptions,
  cardOptions,
  editingTransaction,
  editingScope,
  setEditingScope,
}: SharedLayoutProps & {
  editingTransaction: Transaction
  editingScope: "SINGLE" | "GROUP"
  setEditingScope: React.Dispatch<React.SetStateAction<"SINGLE" | "GROUP">>
}) {
  const secondRowClassName =
    form.type !== "EXPENSE"
      ? "grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      : form.dueDate
        ? "grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
        : "grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"

  return (
    <>
      <div className={secondRowClassName}>
        <CategoryField
          form={form}
          setForm={setForm}
          categoryOptions={categoryOptions}
        />
        <ResponsibleField
          form={form}
          setForm={setForm}
          responsibleOptions={responsibleOptions}
        />
        <DueDateField form={form} setForm={setForm} />
        <PaymentStatusField form={form} setForm={setForm} />
        <PaymentDateField form={form} setForm={setForm} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <BillingDocumentField form={form} setForm={setForm} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <EditScopeField
          editingTransaction={editingTransaction}
          editingScope={editingScope}
          setEditingScope={setEditingScope}
        />
        {editingTransaction.subscriptionId && editingScope === "GROUP" ? (
          <SubscriptionCardField form={form} setForm={setForm} cardOptions={cardOptions} />
        ) : null}
      </div>
    </>
  )
}

export function TransactionComposer({
  isOpen,
  periodLabel,
  periodId,
  form,
  setForm,
  editingTransaction,
  showCancel,
  editingScope,
  setEditingScope,
  categoryOptions,
  responsibleOptions,
  cardOptions,
  formError,
  mutationError,
  createPending,
  createRecurringPending,
  updatePending,
  submitPending,
  onSubmit,
  onCancel,
  focusSignal,
}: TransactionComposerProps) {
  const isEditing = Boolean(editingTransaction)
  const formId = "transaction-composer-form"
  const formRef = useRef<HTMLFormElement | null>(null)
  const descriptionRef = useRef<HTMLInputElement | null>(null)

  // Esc fecha (o Combobox aberto consome o Esc antes, fechando só a lista).
  useEscapeKey(isOpen, onCancel)

  // Foco na descrição ao abrir uma nova transação e depois de "Salvar e adicionar outra". Só no
  // desktop: no celular, focar abriria o teclado por cima do formulário.
  useEffect(() => {
    if (!isOpen || isEditing) return
    if (!window.matchMedia("(min-width: 640px)").matches) return
    descriptionRef.current?.focus()
  }, [isOpen, isEditing, focusSignal])

  if (!isOpen) {
    return null
  }

  return createPortal(
    // Celular: folha que sobe do rodapé (sobra mais tela com o teclado aberto). Desktop: modal.
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 sm:items-start sm:p-4 sm:py-8 sm:backdrop-blur-sm">
        <Card
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? "Editar transação" : "Nova transação"}
          className="grid max-h-[92dvh] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-b-none border-border bg-card shadow-[0_30px_80px_rgba(2,6,23,0.50)] sm:max-h-[90dvh] sm:rounded-b-[1.5rem]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
            <div>
              <p className="app-eyebrow">
                {isEditing ? "Editar transação" : "Nova transação"}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {periodLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCancel}
              aria-label="Fechar"
            >
              <X size={16} />
            </Button>
          </div>

          <div className="overflow-y-auto px-4 py-4 sm:px-5">
            <form
              ref={formRef}
              id={formId}
              className="space-y-4"
              onSubmit={(event) => {
                const submitter = (event.nativeEvent as SubmitEvent).submitter
                const keepOpen =
                  submitter instanceof HTMLButtonElement &&
                  submitter.value === CONTINUE_INTENT
                return onSubmit(event, { keepOpen })
              }}
              onKeyDown={(event) => {
                // Ctrl/Cmd + Enter salva de qualquer campo.
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
            >
              <TransactionCommonRow
                form={form}
                setForm={setForm}
                descriptionRef={descriptionRef}
              />

              {isEditing && editingTransaction ? (
                <TransactionEditFormLayout
                  form={form}
                  setForm={setForm}
                  categoryOptions={categoryOptions}
                  responsibleOptions={responsibleOptions}
                  cardOptions={cardOptions}
                  periodId={periodId}
                  editingTransaction={editingTransaction}
                  editingScope={editingScope}
                  setEditingScope={setEditingScope}
                />
              ) : (
                <TransactionCreateFormLayout
                  form={form}
                  setForm={setForm}
                  categoryOptions={categoryOptions}
                  responsibleOptions={responsibleOptions}
                  cardOptions={cardOptions}
                  periodId={periodId}
                />
              )}
            </form>
          </div>

          <div className="border-t border-border/70 px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-5 sm:pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <FormError message={formError || mutationError} />
              <ActionButtons
                editingTransaction={editingTransaction}
                form={form}
                showCancel={showCancel}
                createPending={createPending}
                createRecurringPending={createRecurringPending}
                updatePending={updatePending}
                submitPending={submitPending}
                onCancel={onCancel}
                formId={formId}
              />
            </div>
          </div>
        </Card>
    </div>,
    document.body
  )
}
