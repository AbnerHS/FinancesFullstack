import { useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Plus, Tags, Trash2, Users } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import {
  useCategoryManager,
  useCreditCardManager,
  useInvoiceManager,
  usePlanCollaborationManager,
  usePlanDeleteManager,
  usePeriodsManager,
  usePlanManager,
  usePlanYearManager,
} from "@/features/finance/hooks.ts"
import type {
  CreditCard,
  Period,
  Plan,
  PlanParticipant,
  TransactionCategory,
} from "@/features/finance/types.ts"
import { formatMonthYear, formatPeriodRange } from "@/features/finance/utils.ts"

type ConfirmationDialogState = {
  confirmLabel: string
  description: string
  title: string
  onConfirm: () => void
}

function ConfirmationDialog({
  onClose,
  state,
}: {
  onClose: () => void
  state: ConfirmationDialogState | null
}) {
  if (!state) {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
        <p className="app-eyebrow">Confirmar exclusão</p>
        <h3 className="mt-2 text-xl font-semibold text-foreground">
          {state.title}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {state.description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => {
              state.onConfirm()
              onClose()
            }}
          >
            <Trash2 size={16} />
            {state.confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function PlanManager({
  plans,
  activePlan,
  periods,
  selectedPlanId,
  onSelectPlanId,
  userId,
}: {
  plans: Plan[]
  activePlan: Plan | null
  periods: Period[]
  selectedPlanId: string | null
  onSelectPlanId: (id: string | null) => void
  userId: string | null
}) {
  const {
    draft,
    mode,
    setDraft,
    saveMutation,
    startCreate,
    startEdit,
    errorMessage,
  } = usePlanManager({ activePlan, userId, onSelectPlanId })
  const {
    addYearMutation,
    deleteYearErrorMessage,
    deleteYearMutation,
    draftYear,
    errorMessage: addYearErrorMessage,
    resetDraft,
    suggestedYear,
    setDraftYear,
  } = usePlanYearManager(activePlan, periods)
  const { deletePlanMutation, errorMessage: deletePlanErrorMessage } =
    usePlanDeleteManager({
      activePlan,
      plans,
      onSelectPlanId,
    })
  const isPlanOwner = Boolean(
    activePlan?.ownerId && userId && activePlan.ownerId === userId
  )
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)
  const yearSummaries = useMemo(() => {
    const monthCountByYear = periods.reduce((acc, period) => {
      acc.set(period.year, (acc.get(period.year) ?? 0) + 1)
      return acc
    }, new Map<number, number>())

    return [...monthCountByYear.entries()]
      .sort(([leftYear], [rightYear]) => leftYear - rightYear)
      .map(([year, monthCount]) => ({ year, monthCount }))
  }, [periods])

  return (
    <section className="app-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Planos Financeiros</p>
          <h2 className="font-serif text-3xl font-semibold text-foreground">
            Estrutura dos seus espaços financeiros
          </h2>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <div className="flex flex-col gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const isActive = plan.id === selectedPlanId
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelectPlanId(plan.id)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  isActive
                    ? "border-primary/20 bg-primary text-primary-foreground shadow-[0_22px_48px_rgba(37,99,235,0.20)]"
                    : "border-border bg-secondary/70 text-foreground hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isActive ? (
                    <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] tracking-[0.22em] uppercase">
                      Ativo
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-2 text-sm ${isActive ? "text-white/80" : "text-muted-foreground"}`}
                >
                  {plan.partnerIds.length > 0
                    ? `Compartilhado com ${plan.partnerIds.length} ${plan.partnerIds.length === 1 ? "parceiro" : "parceiros"}`
                    : "Plano individual"}
                </p>
              </button>
            )
          })}
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-secondary/60 p-5">
            <div className="flex gap-2 rounded-full bg-card/90 p-1">
              <button
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                  mode === "create"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
                onClick={startCreate}
              >
                Criar
              </button>
              <button
                type="button"
                className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                  mode === "edit"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
                onClick={startEdit}
                disabled={!activePlan}
              >
                Editar
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                saveMutation.mutate()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="plan-name">Nome do plano</Label>
                <Input
                  id="plan-name"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ex.: Casa e rotina"
                />
              </div>
              {mode === "create" ? (
                <div className="rounded-[1.25rem] border border-border bg-card/80 p-3 text-sm text-muted-foreground">
                  O plano novo sempre nasce com Janeiro a Dezembro do ano atual
                  para deixar o dashboard pronto para uso.
                </div>
              ) : null}
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={saveMutation.isPending}
              >
                {mode === "create" ? <Plus size={16} /> : null}
                {saveMutation.isPending
                  ? "Salvando..."
                  : mode === "edit"
                    ? "Salvar nome"
                    : "Criar Plano"}
              </Button>
              <FormError message={errorMessage} />

              {activePlan && isPlanOwner ? (
                <div className="rounded-[1.25rem] border border-rose-200/70 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <p className="text-sm font-medium text-foreground">
                    Excluir plano
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Remove o plano ativo e todos os dados vinculados que o
                    backend permitir excluir.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 h-11 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/40 dark:text-rose-300"
                    disabled={deletePlanMutation.isPending}
                    onClick={() =>
                      setConfirmationDialog({
                        confirmLabel: "Excluir Plano",
                        description: `O plano "${activePlan.name}" será removido. Esta ação não pode ser desfeita.`,
                        title: "Excluir plano ativo?",
                        onConfirm: () => deletePlanMutation.mutate(),
                      })
                    }
                  >
                    <Trash2 size={16} />
                    {deletePlanMutation.isPending
                      ? "Excluindo..."
                      : "Excluir Plano"}
                  </Button>
                  <div className="mt-3">
                    <FormError message={deletePlanErrorMessage} />
                  </div>
                </div>
              ) : null}
            </form>
          </Card>

          <Card className="border-border bg-secondary/60 p-5">
            <div>
              <p className="app-eyebrow">Anos do plano</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">
                {activePlan
                  ? `Expandir ${activePlan.name}`
                  : "Selecione um plano"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {activePlan
                  ? "Adicione um novo ano ao plano ativo. Apenas os meses ausentes serão criados."
                  : "Escolha um plano para liberar a criação de um novo ano."}
              </p>
            </div>

            {activePlan ? (
              <>
                <div className="mt-5 flex flex-wrap gap-2">
                  {yearSummaries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum ano encontrado ainda para este plano.
                    </p>
                  ) : (
                    yearSummaries.map(({ year, monthCount }) => (
                      <div
                        key={year}
                        className="rounded-[1rem] border border-border bg-card/80 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-foreground">
                              {year}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {monthCount}/12 meses
                            </div>
                          </div>

                          {isPlanOwner ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-rose-600 hover:text-rose-700"
                              disabled={deleteYearMutation.isPending}
                              onClick={() =>
                                setConfirmationDialog({
                                  confirmLabel: "Excluir Ano",
                                  description: `Todos os meses de ${year} serão removidos do plano "${activePlan.name}".`,
                                  title: `Excluir o ano ${year}?`,
                                  onConfirm: () =>
                                    deleteYearMutation.mutate(year),
                                })
                              }
                            >
                              <Trash2 size={14} />
                              Excluir
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    addYearMutation.mutate()
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="plan-year">Novo ano</Label>
                    <Input
                      id="plan-year"
                      type="number"
                      value={draftYear}
                      onChange={(event) =>
                        setDraftYear(
                          Number(event.target.value) || suggestedYear
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Sugestão automática: {suggestedYear}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      className="h-11 flex-1"
                      disabled={addYearMutation.isPending}
                    >
                      <Plus size={16} />
                      {addYearMutation.isPending
                        ? "Adicionando..."
                        : "Adicionar Ano"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={resetDraft}
                    >
                      Resetar
                    </Button>
                  </div>
                  <FormError message={addYearErrorMessage} />
                  <FormError message={deleteYearErrorMessage} />
                </form>
              </>
            ) : null}
          </Card>
        </div>
      </div>
      <ConfirmationDialog
        onClose={() => setConfirmationDialog(null)}
        state={confirmationDialog}
      />
    </section>
  )
}

export function PeriodsManager({
  activePlan,
  periods,
  selectedPeriodIds,
  selectedStartPeriodId,
  selectedEndPeriodId,
  onSelectStartPeriodId,
  onSelectEndPeriodId,
}: {
  activePlan: Plan | null
  periods: Period[]
  selectedPeriodIds: string[]
  selectedStartPeriodId: string | null
  selectedEndPeriodId: string | null
  onSelectStartPeriodId: (periodId: string) => void
  onSelectEndPeriodId: (periodId: string) => void
}) {
  const { draft, setDraft, saveMutation, errorMessage } =
    usePeriodsManager(activePlan)
  const selectedStartPeriod = useMemo(
    () => periods.find((period) => period.id === selectedStartPeriodId) || null,
    [periods, selectedStartPeriodId]
  )
  const selectedEndPeriod = useMemo(
    () => periods.find((period) => period.id === selectedEndPeriodId) || null,
    [periods, selectedEndPeriodId]
  )
  const rangeLabel = formatPeriodRange(selectedStartPeriod, selectedEndPeriod)
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]

  return (
    <section className="app-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Períodos</p>
          <h2 className="font-serif text-3xl font-semibold text-foreground">
            Comparação mensal e manutenção
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/70 px-4 py-2 text-sm text-muted-foreground">
          {selectedPeriodIds.length} períodos no intervalo
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
        <Card className="border-border bg-secondary/60 p-5">
          <p className="app-eyebrow">Intervalo ativo</p>
          <h3 className="mt-2 text-xl font-semibold text-foreground">
            {rangeLabel}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha o mês inicial e o mês final para definir os painéis e
            comparações do dashboard.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mês inicial</Label>
              <Select
                disabled={periods.length === 0}
                value={selectedStartPeriodId || ""}
                onChange={(event) => onSelectStartPeriodId(event.target.value)}
              >
                {periods.length === 0 ? (
                  <option value="">Sem períodos</option>
                ) : null}
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {formatMonthYear(period)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês final</Label>
              <Select
                disabled={periods.length === 0}
                value={selectedEndPeriodId || ""}
                onChange={(event) => onSelectEndPeriodId(event.target.value)}
              >
                {periods.length === 0 ? (
                  <option value="">Sem períodos</option>
                ) : null}
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {formatMonthYear(period)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {periods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Crie um período para começar a trabalhar por mês.
              </p>
            ) : (
              periods.map((period) => {
                const selected = selectedPeriodIds.includes(period.id)
                return (
                  <span
                    key={period.id}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      selected
                        ? "border-primary/20 bg-primary/10 text-primary"
                        : "border-border bg-card/80 text-muted-foreground"
                    }`}
                  >
                    {formatMonthYear(period)}
                  </span>
                )
              })
            )}
          </div>
        </Card>

        <Card className="border-border bg-secondary/60 p-5">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              saveMutation.mutate()
            }}
          >
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select
                value={String(draft.month)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    month: Number(event.target.value),
                  }))
                }
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Input
                type="number"
                value={draft.year}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    year: Number(event.target.value),
                  }))
                }
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full"
              disabled={saveMutation.isPending}
            >
              <Plus size={16} />
              {saveMutation.isPending ? "Criando..." : "Criar Período"}
            </Button>
            <FormError message={errorMessage} />
          </form>
        </Card>
      </div>
    </section>
  )
}

export function CreditCardsManager({
  creditCards,
  userId,
}: {
  creditCards: CreditCard[]
  userId: string | null
}) {
  const {
    form,
    setForm,
    isEditing,
    editingCard,
    saveMutation,
    errorMessage,
    startCreate,
    startEdit,
    cancelEdit,
  } = useCreditCardManager({ userId })

  return (
    <Card className="border-border bg-secondary/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="app-eyebrow">Cartões de Crédito</h3>
        {!isEditing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCreate}
          >
            <Plus size={16} />
            Novo Cartão
          </Button>
        ) : null}
      </div>

      <div className="mb-4 space-y-2">
        {creditCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cartão cadastrado.
          </p>
        ) : null}
        {creditCards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-[1rem] border border-border bg-card/90 px-3 py-2"
          >
            <span className="text-sm font-medium text-foreground">
              {card.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => startEdit(card)}
            >
              Editar
            </Button>
          </div>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          saveMutation.mutate()
        }}
      >
        <div className="space-y-2">
          <Label>{isEditing ? "Editar Cartão" : "Novo Cartão"}</Label>
          <Input
            value={form.name}
            onChange={(event) => setForm({ name: event.target.value })}
            placeholder="Ex.: Nubank"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="h-11 flex-1"
            disabled={saveMutation.isPending}
          >
            {!isEditing ? <Plus size={16} /> : null}
            {saveMutation.isPending
              ? "Salvando..."
              : isEditing
                ? "Salvar edição"
                : "Criar Cartão"}
          </Button>
          {isEditing ? (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={cancelEdit}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
        {editingCard?.name ? (
          <p className="text-xs text-muted-foreground">
            Editando: {editingCard.name}
          </p>
        ) : null}
        <FormError message={errorMessage} />
      </form>
    </Card>
  )
}

export function InvoiceManager({
  creditCards,
  periods,
  selectedPeriodIds,
}: {
  creditCards: CreditCard[]
  periods: Period[]
  selectedPeriodIds: string[]
}) {
  const { form, setForm, createInvoice, errorMessage } = useInvoiceManager({
    creditCards,
    periods,
    selectedPeriodIds,
  })

  return (
    <Card className="border-border bg-secondary/60 p-5">
      <h3 className="app-eyebrow">Criar Fatura</h3>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          createInvoice.mutate()
        }}
      >
        <Select
          value={form.creditCardId}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              creditCardId: event.target.value,
            }))
          }
        >
          {creditCards.length === 0 ? (
            <option value="">Sem cartões</option>
          ) : null}
          {creditCards.length > 0 ? (
            <option value="">Selecione o cartão</option>
          ) : null}
          {creditCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </Select>

        <Select
          value={form.periodId}
          onChange={(event) =>
            setForm((current) => ({ ...current, periodId: event.target.value }))
          }
        >
          {periods.length === 0 ? <option value="">Sem períodos</option> : null}
          {periods.length > 0 ? (
            <option value="">Selecione o período</option>
          ) : null}
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {formatMonthYear(period)}
            </option>
          ))}
        </Select>

        <CurrencyInput
          value={form.amount}
          onValueChange={(nextValue) =>
            setForm((current) => ({ ...current, amount: nextValue }))
          }
        />

        <Button
          type="submit"
          className="h-11 w-full"
          disabled={createInvoice.isPending}
        >
          <Plus size={16} />
          {createInvoice.isPending ? "Criando..." : "Criar Fatura"}
        </Button>
        <FormError message={errorMessage} />
      </form>
    </Card>
  )
}

export function CategoryManager({
  categories,
}: {
  categories: TransactionCategory[]
}) {
  const { draft, setDraft, createMutation, errorMessage } = useCategoryManager()

  return (
    <section className="app-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Categorias</p>
          <h3 className="font-serif text-2xl font-semibold text-foreground">
            Base de classificação
          </h3>
        </div>
        <div className="rounded-full bg-primary/12 p-3 text-primary">
          <Tags size={18} />
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          ) : null}
          {categories.map((category) => (
            <span
              key={category.id}
              className="rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {category.name}
            </span>
          ))}
        </div>

        <Card className="border-border bg-secondary/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate()
            }}
          >
            <Label>Nova Categoria</Label>
            <Input
              className="mt-3"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ex.: Educação"
            />
            <Button
              type="submit"
              className="mt-3 h-11 w-full"
              disabled={createMutation.isPending}
            >
              <Plus size={16} />
              {createMutation.isPending ? "Salvando..." : "Criar Categoria"}
            </Button>
            <div className="mt-3">
              <FormError message={errorMessage} />
            </div>
          </form>
        </Card>
      </div>
    </section>
  )
}

export function DashboardPlanQuickCreate({
  activePlan,
  hasPlans,
  onSelectPlanId,
  userId,
}: {
  activePlan: Plan | null
  hasPlans: boolean
  onSelectPlanId: (id: string | null) => void
  userId: string | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { draft, setDraft, saveMutation, errorMessage, startCreate } =
    usePlanManager({ activePlan, userId, onSelectPlanId })

  const openModal = () => {
    startCreate()
    setIsOpen(true)
  }

  return (
    <>
      <div className="flex items-end">
        <Button type="button" className="h-11 w-full" onClick={openModal}>
          {hasPlans ? "Novo Plano" : "Criar Primeiro Plano"}
          <Plus size={16} />
        </Button>
      </div>

      {isOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-eyebrow">
                      {hasPlans ? "Novo Plano" : "Bem-vindo"}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">
                      {hasPlans
                        ? "Crie outro espaço financeiro"
                        : "Vamos montar seu primeiro plano"}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {hasPlans
                        ? "Você pode começar do zero, e o ano atual será preparado automaticamente."
                        : "Comece criando um plano para organizar suas transações, categorias, cartões e períodos."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>

                <form
                  className="mt-5 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault()
                    try {
                      await saveMutation.mutateAsync()
                      setIsOpen(false)
                    } catch {
                      // O hook ja expoe a mensagem de erro para o formulario.
                    }
                  }}
                >
                  <div className="space-y-2">
                    <Label>Nome do plano</Label>
                    <Input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Ex.: Casa 2026"
                    />
                  </div>

                  <div className="rounded-[1.25rem] border border-border bg-secondary/55 p-4 text-sm text-muted-foreground">
                    Janeiro a Dezembro do ano atual serão criados
                    automaticamente assim que o plano for salvo.
                  </div>

                  {!hasPlans ? (
                    <div className="rounded-[1.25rem] border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                      Dica: seu primeiro plano já nasce com o ano atual completo
                      para liberar o dashboard, os lançamentos e as comparações
                      mensais.
                    </div>
                  ) : null}

                  <FormError message={errorMessage} />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      <Plus size={16} />
                      {saveMutation.isPending ? "Criando..." : "Criar Plano"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export function PlanParticipantsManager({
  activePlan,
  participants,
  isPlanOwner,
}: {
  activePlan: Plan | null
  participants: PlanParticipant[]
  isPlanOwner: boolean
}) {
  const {
    inviteLink,
    inviteLinkLoading,
    rotateInviteLink,
    revokeInviteLink,
    removeParticipant,
    inviteErrorMessage,
  } = usePlanCollaborationManager({ activePlan, isPlanOwner })
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)

  if (!activePlan) {
    return null
  }

  const partnerCount = participants.filter(
    (participant) => participant.role === "PARTNER"
  ).length
  const inviteUrl =
    inviteLink?.active && inviteLink.inviteToken
      ? `${window.location.origin}/invite/${inviteLink.inviteToken}`
      : ""

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card className="border-border bg-secondary/60 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.28em] text-muted-foreground uppercase">
          <Users size={16} /> Convite por link
        </h3>

        {isPlanOwner ? (
          <>
            <div className="space-y-2">
              <Label>Link ativo</Label>
              <Input
                readOnly
                value={inviteUrl}
                placeholder={
                  inviteLinkLoading ? "Carregando link..." : "Nenhum link ativo"
                }
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={async () => {
                  if (!inviteUrl) {
                    rotateInviteLink.mutate()
                    return
                  }

                  try {
                    await navigator.clipboard.writeText(inviteUrl)
                    setCopyFeedback(
                      "Link copiado para a área de transferência."
                    )
                  } catch {
                    setCopyFeedback("Não foi possível copiar automaticamente.")
                  }
                }}
                disabled={rotateInviteLink.isPending || inviteLinkLoading}
              >
                {inviteUrl
                  ? "Copiar link"
                  : rotateInviteLink.isPending
                    ? "Gerando..."
                    : "Gerar link"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => rotateInviteLink.mutate()}
                disabled={rotateInviteLink.isPending || !activePlan}
              >
                {rotateInviteLink.isPending
                  ? "Rotacionando..."
                  : inviteUrl
                    ? "Rotacionar link"
                    : "Gerar novo link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => revokeInviteLink.mutate()}
                disabled={revokeInviteLink.isPending || !inviteUrl}
              >
                {revokeInviteLink.isPending ? "Revogando..." : "Revogar link"}
              </Button>
            </div>

            {copyFeedback ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {copyFeedback}
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-[1.25rem] border border-border bg-card/80 p-4 text-sm text-muted-foreground">
            Somente o owner do plano pode gerar, rotacionar ou revogar links de
            convite.
          </div>
        )}

        <div className="mt-3">
          <FormError message={inviteErrorMessage} />
        </div>
      </Card>

      <Card className="border-border bg-secondary/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Participantes atuais
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {partnerCount === 0
                ? "Este plano ainda não possui parceiros adicionais."
                : `${partnerCount} ${partnerCount === 1 ? "parceiro ativo" : "parceiros ativos"}`}
            </p>
          </div>
          <div className="rounded-full bg-accent px-3 py-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {participants.length} pessoas
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className="rounded-[1.25rem] border border-border bg-card/90 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {participant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participant.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                    {participant.role === "OWNER" ? "Owner" : "Partner"}
                  </span>

                  {isPlanOwner && participant.role === "PARTNER" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfirmationDialog({
                          confirmLabel: "Remover Parceiro",
                          description: `${participant.name} deixará de participar deste plano.`,
                          title: `Remover ${participant.name}?`,
                          onConfirm: () =>
                            removeParticipant.mutate(participant.userId),
                        })
                      }
                      disabled={removeParticipant.isPending}
                    >
                      {removeParticipant.isPending ? "Removendo..." : "Remover"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <ConfirmationDialog
        onClose={() => setConfirmationDialog(null)}
        state={confirmationDialog}
      />
    </div>
  )
}
