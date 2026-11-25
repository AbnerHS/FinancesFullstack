import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  CalendarSync,
  CreditCard,
  Link2,
  Minus,
  Paperclip,
  Plus,
  Receipt,
  Repeat2,
  Save,
  SendHorizonal,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { Combobox } from "@/components/ui/combobox.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
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

/** Cores por tipo: saída em vermelho, entrada em verde (as mesmas dos valores na lista). */
const TYPE_TONE = {
  EXPENSE: {
    label: "Saída",
    icon: ArrowDownCircle,
    text: "text-rose-600 dark:text-rose-400",
    selected: "border-rose-500/45 bg-rose-500/12 text-rose-700 dark:text-rose-300",
    hover: "hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400",
    bar: "bg-gradient-to-r from-rose-500 via-rose-400 to-orange-400",
    pill: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  REVENUE: {
    label: "Entrada",
    icon: ArrowUpCircle,
    text: "text-emerald-600 dark:text-emerald-400",
    selected: "border-emerald-500/45 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    hover: "hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400",
    bar: "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400",
    pill: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
} as const

/** Cores das opções de Cobrança (ícone sempre colorido; fundo quando escolhida). */
const CHARGE_TONE = {
  NONE: {
    icon: "text-sky-600 dark:text-sky-400",
    selected: "border-sky-500/45 bg-sky-500/12 text-sky-700 dark:text-sky-300",
    hover: "hover:border-sky-500/40",
  },
  RECURRING: {
    icon: "text-violet-600 dark:text-violet-400",
    selected: "border-violet-500/45 bg-violet-500/12 text-violet-700 dark:text-violet-300",
    hover: "hover:border-violet-500/40",
  },
  SUBSCRIPTION: {
    icon: "text-amber-600 dark:text-amber-400",
    selected: "border-amber-500/50 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    hover: "hover:border-amber-500/40",
  },
} as const

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

type PillOption<T extends string> = {
  value: T
  label: string
  /** Texto completo na dica (quando o rótulo é curto). */
  title?: string
  icon?: LucideIcon
}

const PRIMARY_PILL = {
  selected: "border-primary/40 bg-primary/12 text-primary",
  hover: "hover:border-primary/40 hover:text-primary",
}

/** Escolha única em pílulas (no lugar de um select com poucas opções). */
function PillGroup<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  options: Array<PillOption<T>>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className={fieldClassName}>
      <Label id={`${id}-label`}>{label}</Label>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="flex min-h-11 flex-wrap items-center gap-1.5"
      >
        {options.map((option) => {
          const selected = option.value === value
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.title}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition sm:px-3.5",
                selected
                  ? PRIMARY_PILL.selected
                  : cn("border-border bg-card/85 text-foreground", PRIMARY_PILL.hover)
              )}
            >
              {Icon ? <Icon size={15} className="shrink-0" aria-hidden="true" /> : null}
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
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
          className={cn("font-semibold tabular-nums", TYPE_TONE[form.type].text)}
          prefixClassName={TYPE_TONE[form.type].text}
          onValueChange={(amount) =>
            setForm((current) => ({ ...current, amount }))
          }
        />
      </div>

      <div className={fieldClassName}>
        <Label id="transaction-type-label">Tipo</Label>
        <div
          role="radiogroup"
          aria-labelledby="transaction-type-label"
          className="grid h-11 grid-cols-2 gap-1.5"
        >
          {(["EXPENSE", "REVENUE"] as const).map((type) => {
            const tone = TYPE_TONE[type]
            const Icon = tone.icon
            const selected = form.type === type
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateType(setForm, type)}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition",
                  selected
                    ? tone.selected
                    : cn("border-border bg-card/85 text-foreground", tone.hover)
                )}
              >
                <Icon size={16} className={cn("shrink-0", !selected && tone.text)} aria-hidden="true" />
                {tone.label}
              </button>
            )
          })}
        </div>
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

/** Cor de cada participante (pela ordem no plano). "Geral" fica neutro. */
const PERSON_TONES = [
  {
    dot: "bg-indigo-500 text-white",
    selected: "border-indigo-500/45 bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    hover: "hover:border-indigo-500/40",
  },
  {
    dot: "bg-pink-500 text-white",
    selected: "border-pink-500/45 bg-pink-500/12 text-pink-700 dark:text-pink-300",
    hover: "hover:border-pink-500/40",
  },
  {
    dot: "bg-teal-500 text-white",
    selected: "border-teal-500/45 bg-teal-500/12 text-teal-700 dark:text-teal-300",
    hover: "hover:border-teal-500/40",
  },
  {
    dot: "bg-orange-500 text-white",
    selected: "border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-orange-300",
    hover: "hover:border-orange-500/40",
  },
] as const

const GENERAL_TONE = {
  selected: "border-slate-500/45 bg-slate-500/12 text-slate-700 dark:text-slate-200",
  hover: "hover:border-slate-500/40",
}

const firstName = (label: string) => label.trim().split(/\s+/)[0] || label

/** Responsável em pílulas: "Geral" e cada participante do plano (primeiro nome, inicial colorida). */
function ResponsibleField({
  form,
  setForm,
  responsibleOptions,
}: Pick<SharedLayoutProps, "form" | "setForm" | "responsibleOptions">) {
  const choose = (responsibleUserId: string) =>
    setForm((current) => ({ ...current, responsibleUserId }))
  const pillClassName = (selected: boolean, tone: { selected: string; hover: string }) =>
    cn(
      "inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border pr-3.5 pl-1.5 text-sm font-medium transition",
      selected ? tone.selected : cn("border-border bg-card/85 text-foreground", tone.hover)
    )

  return (
    <div className={fieldClassName}>
      <Label id="transaction-responsible-label">Responsável</Label>
      <div
        role="radiogroup"
        aria-labelledby="transaction-responsible-label"
        className="flex min-h-11 flex-wrap items-center gap-1.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={!form.responsibleUserId}
          title="Sem responsável específico"
          onClick={() => choose("")}
          className={pillClassName(!form.responsibleUserId, GENERAL_TONE)}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-300">
            <Users size={13} aria-hidden="true" />
          </span>
          Geral
        </button>
        {responsibleOptions.map((option, index) => {
          const tone = PERSON_TONES[index % PERSON_TONES.length]
          const selected = form.responsibleUserId === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.label}
              onClick={() => choose(option.id)}
              className={pillClassName(selected, tone)}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  tone.dot
                )}
                aria-hidden="true"
              >
                {option.label.trim().charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{firstName(option.label)}</span>
            </button>
          )
        })}
      </div>
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

      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PillGroup<TransactionFormValues["billingDocumentType"]>
          id="billing-document-type"
          label="Tipo"
          value={form.billingDocumentType}
          options={[
            { value: "NONE", label: "Nenhum", icon: Ban },
            { value: "LINK", label: "Link", icon: Link2 },
            { value: "FILE", label: "Arquivo", icon: Paperclip },
          ]}
          onChange={(nextType) =>
            setForm((current) => ({
              ...current,
              billingDocumentType: nextType,
              billingDocumentUrl:
                nextType === "LINK"
                  ? current.billingDocumentType === "LINK"
                    ? current.billingDocumentUrl
                    : current.billingDocumentExisting?.type === "LINK"
                      ? current.billingDocumentExisting.url || ""
                      : ""
                  : "",
              billingDocumentFile: null,
            }))
          }
        />

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
    <PillGroup
      id="subscription-card"
      label="Cobrada no cartão"
      value={form.subscriptionCardId}
      options={[
        { value: "", label: "Não", title: "Conta ou débito automático", icon: Wallet },
        ...cardOptions.map((card) => ({ value: card.value, label: card.label, icon: CreditCard })),
      ]}
      onChange={(subscriptionCardId) =>
        setForm((current) => ({ ...current, subscriptionCardId }))
      }
    />
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
          className="flex h-11 items-center rounded-xl border border-violet-500/30 bg-violet-500/[0.06]"
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
                  ? CHARGE_TONE.RECURRING.selected
                  : "border-border bg-card/85 text-foreground hover:border-violet-500/40 hover:text-violet-600 dark:hover:text-violet-400"
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
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition sm:px-3.5",
                mode === option.value
                  ? CHARGE_TONE[option.value].selected
                  : cn("border-border bg-card/85 text-foreground", CHARGE_TONE[option.value].hover)
              )}
            >
              <option.icon
                size={15}
                className={cn("shrink-0", mode !== option.value && CHARGE_TONE[option.value].icon)}
                aria-hidden="true"
              />
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
    <PillGroup<"SINGLE" | "GROUP">
      id="edit-scope"
      label="Aplicar edição"
      value={editingScope}
      options={
        isSubscription
          ? [
              {
                value: "SINGLE",
                label: "Só este mês",
                title: "Somente a cobrança deste mês",
                icon: Receipt,
              },
              {
                value: "GROUP",
                label: "Este e os próximos",
                title: "Esta e as próximas cobranças da assinatura",
                icon: CalendarSync,
              },
            ]
          : [
              { value: "SINGLE", label: "Só esta", title: "Somente esta transação", icon: Receipt },
              {
                value: "GROUP",
                label: "Todo o grupo",
                title: "Todas do grupo recorrente",
                icon: Repeat2,
              },
            ]
      }
      onChange={setEditingScope}
    />
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
    // Sempre numa linha: no celular o "Cancelar" some (o ✕ do topo fecha o formulário).
    <div className="flex flex-nowrap items-end gap-2 lg:justify-end">
      <Button
        type="submit"
        form={formId}
        className="h-11 min-w-0 flex-1 lg:min-w-[180px]"
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
          className="h-11 shrink-0"
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
          className="hidden h-11 shrink-0 sm:inline-flex"
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
  // Responsável em pílulas precisa de largura para "Geral" e os participantes numa linha.
  const secondRowClassName =
    form.type === "EXPENSE"
      ? "grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)]"
      : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"

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
  // Categoria e responsável numa linha; vencimento e pagamento na seguinte (as pílulas do
  // responsável não cabem numa coluna de cinco).
  const paymentRowClassName = form.dueDate
    ? "grid gap-3 lg:grid-cols-3"
    : "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
      </div>
      <div className={form.type === "EXPENSE" ? paymentRowClassName : "hidden"}>
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
          <div className="relative flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-5">
            <span
              aria-hidden="true"
              className={cn("absolute inset-x-0 top-0 h-1 transition-colors", TYPE_TONE[form.type].bar)}
            />
            <div>
              <p className="app-eyebrow">
                {isEditing ? "Editar transação" : "Nova transação"}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                {periodLabel}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    TYPE_TONE[form.type].pill
                  )}
                >
                  {form.type === "EXPENSE" ? (
                    <ArrowDownCircle size={12} aria-hidden="true" />
                  ) : (
                    <ArrowUpCircle size={12} aria-hidden="true" />
                  )}
                  {TYPE_TONE[form.type].label}
                </span>
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
