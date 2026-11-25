import { useState } from "react"
import { CalendarClock, Gauge, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Combobox } from "@/components/ui/combobox.tsx"
import { FormDialog } from "@/components/ui/form-dialog.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Label } from "@/components/ui/label.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import { DueDayPicker } from "@/features/finance/due-day-picker.tsx"
import { useForecastMutations } from "@/features/finance/hooks.ts"
import { ResponsiblePills } from "@/features/finance/responsible-pills.tsx"
import type {
  Forecast,
  ForecastPayload,
  ResponsibleOption,
  TransactionCategory,
} from "@/features/finance/types.ts"
import {
  formatCurrency,
  formatCurrencyInput,
  formatDateOnly,
  parseCurrencyInput,
  todayIso,
  type ForecastItem,
  type ForecastMonth,
} from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils.ts"

/**
 * Previsto × real do mês: uma barra por previsão (gasto real da categoria sobre o previsto). Nos
 * meses que não fecharam, o que falta entra nas despesas do mês como gasto previsto.
 */
export function ForecastsCard({
  planId,
  monthId,
  forecast,
  forecasts,
  categories,
  responsibleOptions,
}: {
  planId: string | null
  monthId: string
  forecast: ForecastMonth | undefined
  forecasts: Forecast[]
  categories: TransactionCategory[]
  responsibleOptions: ResponsibleOption[]
}) {
  const [manageOpen, setManageOpen] = useState(false)
  const items = forecast?.items ?? []
  const open = monthId >= todayIso().slice(0, 7)

  return (
    <section className="app-panel p-4 sm:p-5" aria-label="Previsto × real">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Gauge size={16} className="shrink-0 text-primary" aria-hidden="true" />
          <h3 className="app-eyebrow">Previsto × real</h3>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          {forecasts.length > 0 ? (
            <>
              <Pencil size={14} />
              Previsões
            </>
          ) : (
            <>
              <Plus size={14} />
              Nova previsão
            </>
          )}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {forecasts.length === 0
            ? "Defina quanto espera gastar por categoria (ex.: Combustível R$ 250/mês). O gasto real é a soma das transações da categoria, sem lançamentos estimados."
            : "Nenhuma previsão vale neste mês."}
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <ForecastRow key={item.forecast.id} item={item} open={open} />
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            <span>
              Real <strong className="text-foreground tabular-nums">{formatCurrency(forecast!.actual)}</strong>{" "}
              de {formatCurrency(forecast!.planned)} previstos
            </span>
            {open && forecast!.pending > 0 ? (
              <span title="Já somado às despesas e ao saldo do mês">
                Ainda previsto:{" "}
                <strong className="text-foreground tabular-nums">{formatCurrency(forecast!.pending)}</strong>
              </span>
            ) : null}
          </div>
        </>
      )}

      <ManageForecastsDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        planId={planId}
        forecasts={forecasts}
        categories={categories}
        responsibleOptions={responsibleOptions}
      />
    </section>
  )
}

function ForecastRow({ item, open }: { item: ForecastItem; open: boolean }) {
  const ratio = item.planned > 0 ? item.actual / item.planned : 0
  const difference = item.actual - item.planned

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          <span className="truncate">{item.label}</span>
          {item.dueDate ? (
            <CalendarClock size={12} className="shrink-0 text-muted-foreground" aria-label="Com vencimento" />
          ) : null}
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          <strong className={cn("text-foreground", item.over && "text-rose-600 dark:text-rose-400")}>
            {formatCurrency(item.actual)}
          </strong>{" "}
          de {formatCurrency(item.planned)}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label={`${item.label}: ${Math.round(ratio * 100)}% do previsto`}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            item.over ? "bg-rose-500" : ratio >= 0.85 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {item.over
          ? `${formatCurrency(difference)} acima do previsto`
          : open
            ? item.pending > 0
              ? `Faltam ${formatCurrency(item.pending)}${item.dueDate && item.actual === 0 ? ` · vence ${formatDateOnly(item.dueDate).slice(0, 5)}` : ""}`
              : "Atingiu o previsto"
            : `${formatCurrency(-difference)} abaixo do previsto`}
      </p>
    </li>
  )
}

type FormState = {
  id?: string
  categoryName: string
  categoryId: string
  amount: string
  responsibleUserId: string
  dueDay: number | null
}

const emptyForm = (): FormState => ({
  categoryName: "",
  categoryId: "",
  amount: "",
  responsibleUserId: "",
  dueDay: null,
})

function ManageForecastsDialog({
  open,
  onClose,
  planId,
  forecasts,
  categories,
  responsibleOptions,
}: {
  open: boolean
  onClose: () => void
  planId: string | null
  forecasts: Forecast[]
  categories: TransactionCategory[]
  responsibleOptions: ResponsibleOption[]
}) {
  const mutations = useForecastMutations(planId)
  const [form, setForm] = useState<FormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // Excluir apaga também o previsto dos meses passados: confirma na própria linha.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const thisMonth = todayIso().slice(0, 7)

  const close = () => {
    setForm(null)
    setFormError(null)
    onClose()
  }

  const startEdit = (forecast: Forecast) => {
    setFormError(null)
    setForm({
      id: forecast.id,
      categoryName: forecast.category.name ?? "",
      categoryId: forecast.category.id,
      amount: formatCurrencyInput(String(Math.round(forecast.amount * 100))),
      responsibleUserId: forecast.responsibleUserId ?? "",
      dueDay: forecast.dueDay ?? null,
    })
  }

  const submit = () => {
    if (!form) return
    const amount = parseCurrencyInput(form.amount)
    if (!form.categoryName.trim()) return setFormError("Informe a categoria.")
    if (Number.isNaN(amount) || amount <= 0) return setFormError("Informe um valor válido.")
    setFormError(null)
    const payload: ForecastPayload = {
      category: form.categoryId ? { id: form.categoryId } : { name: form.categoryName.trim() },
      amount,
      responsibleUserId: form.responsibleUserId || null,
      dueDay: form.dueDay,
    }
    mutations.save.mutate({ id: form.id, payload }, { onSuccess: () => setForm(null) })
  }

  const active = forecasts.filter((forecast) => !forecast.endMonth || forecast.endMonth >= thisMonth)

  return (
    <FormDialog open={open} title={form ? (form.id ? "Editar previsão" : "Nova previsão") : "Previsões"} onClose={close}>
      {form ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Combobox
              allowCustomValue
              options={categories.map((category) => ({ label: category.name, value: category.id }))}
              preventSubmitOnEnter
              selectFirstFilteredOptionOnEnter
              value={form.categoryName}
              onValueChange={(categoryName, matched) =>
                setForm((current) =>
                  current ? { ...current, categoryName, categoryId: matched?.value || "" } : current
                )
              }
              placeholder="Ex.: Combustível"
            />
          </div>
          <div className="space-y-2">
            <Label>Valor previsto por mês</Label>
            <CurrencyInput
              value={form.amount}
              onValueChange={(amount) => setForm((current) => (current ? { ...current, amount } : current))}
            />
            {form.id ? (
              <p className="text-xs text-muted-foreground">
                Um valor novo vale deste mês em diante; os meses anteriores guardam o valor antigo.
              </p>
            ) : null}
          </div>
          <ResponsiblePills
            id="forecast-responsible"
            options={responsibleOptions}
            value={form.responsibleUserId}
            onChange={(responsibleUserId) =>
              setForm((current) => (current ? { ...current, responsibleUserId } : current))
            }
            everyoneLabel="Geral"
          />
          <DueDayPicker
            id="forecast-due-day"
            label="Vencimento (contas)"
            value={form.dueDay}
            onChange={(dueDay) => setForm((current) => (current ? { ...current, dueDay } : current))}
            hint={(day) =>
              day
                ? `Até a conta real ser lançada, aparece em Contas a pagar como prevista, vencendo no dia ${day}.`
                : "Sem dia para gastos espalhados no mês (ex.: combustível). Com dia para uma conta (ex.: energia)."
            }
          />
          <FormError message={formError || mutations.errorMessage} />
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="h-11 flex-1" disabled={mutations.save.isPending}>
              {mutations.save.isPending ? "Salvando..." : form.id ? "Salvar" : "Criar previsão"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setForm(null)}>
              Voltar
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma previsão. Crie uma para cada gasto que varia todo mês (combustível, energia,
              mercado...).
            </p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl border border-border">
              {active.map((forecast) => (
                <li key={forecast.id} className="flex items-center gap-2 py-2 pr-1 pl-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {forecast.category.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatCurrency(forecast.amount)}/mês
                      {forecast.dueDay ? ` · vence dia ${forecast.dueDay}` : ""}
                    </span>
                  </span>
                  {confirmDeleteId === forecast.id ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Excluir?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={mutations.remove.isPending}
                        onClick={() =>
                          mutations.remove.mutate(forecast, { onSettled: () => setConfirmDeleteId(null) })
                        }
                      >
                        Sim
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDeleteId(null)}>
                        Não
                      </Button>
                    </span>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground"
                        onClick={() => startEdit(forecast)}
                        aria-label={`Editar previsão ${forecast.category.name}`}
                      >
                        <Pencil size={15} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 text-rose-600 dark:text-rose-400"
                        onClick={() => setConfirmDeleteId(forecast.id)}
                        aria-label={`Excluir previsão ${forecast.category.name}`}
                        title="Excluir (apaga também o previsto dos meses passados)"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <FormError message={mutations.errorMessage} />
          <Button type="button" className="h-11 w-full" onClick={() => setForm(emptyForm())}>
            <Plus size={16} />
            Nova previsão
          </Button>
        </div>
      )}
    </FormDialog>
  )
}
