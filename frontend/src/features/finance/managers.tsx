import { useState } from "react"
import { createPortal } from "react-dom"
import { Plus, Tags, Users } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { Select } from "@/components/ui/select.tsx"
import { Switch } from "@/components/ui/switch.tsx"
import { CurrencyInput } from "@/features/finance/currency-input.tsx"
import {
  useCategoryManager,
  useCreditCardManager,
  useInvoiceManager,
  usePartnerManager,
  usePeriodsManager,
  usePlanManager,
} from "@/features/finance/hooks.ts"
import type { CreditCard, Period, Plan, TransactionCategory } from "@/features/finance/types.ts"
import { formatMonthYear } from "@/features/finance/utils.ts"

export function PlanManager({
  plans,
  activePlan,
  selectedPlanId,
  onSelectPlanId,
  userId,
}: {
  plans: Plan[]
  activePlan: Plan | null
  selectedPlanId: string | null
  onSelectPlanId: (id: string | null) => void
  userId: string | null
}) {
  const {
    createYearPeriods,
    draft,
    mode,
    periodsYear,
    setDraft,
    setCreateYearPeriods,
    setPeriodsYear,
    saveMutation,
    startCreate,
    startEdit,
    errorMessage,
  } = usePlanManager({ activePlan, userId, onSelectPlanId })

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
        <div className="grid gap-3 md:grid-cols-2">
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
                    <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] uppercase tracking-[0.22em]">
                      Ativo
                    </span>
                  ) : null}
                </div>
                <p className={`mt-2 text-sm ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                  {plan.partnerId ? "Compartilhado com parceiro" : "Plano individual"}
                </p>
              </button>
            )
          })}
        </div>

        <Card className="border-border bg-secondary/60 p-5">
          <div className="flex gap-2 rounded-full bg-card/90 p-1">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                mode === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              onClick={startCreate}
            >
              Criar
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${
                mode === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
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
              <div className="rounded-[1.25rem] border border-border bg-card/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label>Criar 12 Períodos</Label>
                    <p className="text-xs text-muted-foreground">
                      Gera Janeiro a Dezembro automaticamente.
                    </p>
                  </div>
                  <Switch
                    checked={createYearPeriods}
                    onClick={() => setCreateYearPeriods(!createYearPeriods)}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  <Label>Ano dos Períodos</Label>
                  <Input
                    disabled={!createYearPeriods}
                    type="number"
                    value={periodsYear}
                    onChange={(event) => setPeriodsYear(Number(event.target.value) || periodsYear)}
                  />
                </div>
              </div>
            ) : null}
            <Button type="submit" className="h-11 w-full" disabled={saveMutation.isPending}>
              {mode === "create" ? <Plus size={16} /> : null}
              {saveMutation.isPending
                ? "Salvando..."
                : mode === "edit"
                  ? "Salvar nome"
                  : "Criar Plano"}
            </Button>
            <FormError message={errorMessage} />
          </form>
        </Card>
      </div>
    </section>
  )
}

export function PeriodsManager({
  activePlan,
  periods,
  selectedPeriodIds,
  onTogglePeriodId,
}: {
  activePlan: Plan | null
  periods: Period[]
  selectedPeriodIds: string[]
  onTogglePeriodId: (periodId: string) => void
}) {
  const { draft, setDraft, saveMutation, errorMessage } = usePeriodsManager(activePlan)
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
          {selectedPeriodIds.length} períodos em comparação
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
        <div className="grid gap-3 md:grid-cols-2">
          {periods.map((period) => {
            const selected = selectedPeriodIds.includes(period.id)
            return (
              <button
                key={period.id}
                type="button"
                onClick={() => onTogglePeriodId(period.id)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${
                  selected
                    ? "border-primary/20 bg-accent/80"
                    : "border-border bg-secondary/60 hover:border-primary/40"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Período</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {formatMonthYear(period)}
                </h3>
              </button>
            )
          })}
        </div>

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
                  setDraft((current) => ({ ...current, month: Number(event.target.value) }))
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
                  setDraft((current) => ({ ...current, year: Number(event.target.value) }))
                }
              />
            </div>

            <Button type="submit" className="h-11 w-full" disabled={saveMutation.isPending}>
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
          <Button type="button" variant="outline" size="sm" onClick={startCreate}>
            <Plus size={16} />
            Novo Cartão
          </Button>
        ) : null}
      </div>

      <div className="mb-4 space-y-2">
        {creditCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        ) : null}
        {creditCards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-[1rem] border border-border bg-card/90 px-3 py-2"
          >
            <span className="text-sm font-medium text-foreground">{card.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(card)}>
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
          <Button type="submit" className="h-11 flex-1" disabled={saveMutation.isPending}>
            {!isEditing ? <Plus size={16} /> : null}
            {saveMutation.isPending
              ? "Salvando..."
              : isEditing
                ? "Salvar edição"
                : "Criar Cartão"}
          </Button>
          {isEditing ? (
            <Button type="button" variant="outline" className="h-11" onClick={cancelEdit}>
              Cancelar
            </Button>
          ) : null}
        </div>
        {editingCard?.name ? (
          <p className="text-xs text-muted-foreground">Editando: {editingCard.name}</p>
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
            setForm((current) => ({ ...current, creditCardId: event.target.value }))
          }
        >
          {creditCards.length === 0 ? <option value="">Sem cartões</option> : null}
          {creditCards.length > 0 ? <option value="">Selecione o cartão</option> : null}
          {creditCards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </Select>

        <Select
          value={form.periodId}
          onChange={(event) => setForm((current) => ({ ...current, periodId: event.target.value }))}
        >
          {periods.length === 0 ? <option value="">Sem períodos</option> : null}
          {periods.length > 0 ? <option value="">Selecione o período</option> : null}
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

        <Button type="submit" className="h-11 w-full" disabled={createInvoice.isPending}>
          <Plus size={16} />
          {createInvoice.isPending ? "Criando..." : "Criar Fatura"}
        </Button>
        <FormError message={errorMessage} />
      </form>
    </Card>
  )
}

export function CategoryManager({ categories }: { categories: TransactionCategory[] }) {
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
            <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
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
            <Button type="submit" className="mt-3 h-11 w-full" disabled={createMutation.isPending}>
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
  const {
    createYearPeriods,
    draft,
    periodsYear,
    setDraft,
    setCreateYearPeriods,
    setPeriodsYear,
    saveMutation,
    errorMessage,
    startCreate,
  } = usePlanManager({ activePlan, userId, onSelectPlanId })

  const openModal = () => {
    startCreate()
    setIsOpen(true)
  }

  return (
    <>
      <div className="flex items-end">
        <Button type="button" className="h-11 w-full" onClick={openModal}>
          <Plus size={16} />
          {hasPlans ? "Novo Plano" : "Criar Primeiro Plano"}
        </Button>
      </div>

      {isOpen
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-eyebrow">{hasPlans ? "Novo Plano" : "Bem-vindo"}</p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground">
                      {hasPlans ? "Crie outro espaço financeiro" : "Vamos montar seu primeiro plano"}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {hasPlans
                        ? "Você pode começar do zero e, se quiser, já criar todos os períodos do ano."
                        : "Comece criando um plano para organizar suas transações, categorias, cartões e períodos."}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
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

                  <div className="rounded-[1.25rem] border border-border bg-secondary/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label>Gerar 12 Períodos</Label>
                        <p className="text-xs text-muted-foreground">
                          Cria Janeiro a Dezembro automaticamente para você começar mais rápido.
                        </p>
                      </div>
                      <Switch
                        checked={createYearPeriods}
                        onClick={() => setCreateYearPeriods(!createYearPeriods)}
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label>Ano</Label>
                      <Input
                        disabled={!createYearPeriods}
                        type="number"
                        value={periodsYear}
                        onChange={(event) => setPeriodsYear(Number(event.target.value) || periodsYear)}
                      />
                    </div>
                  </div>

                  {!hasPlans ? (
                    <div className="rounded-[1.25rem] border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                      Dica: se este for seu primeiro plano, ativar os 12 períodos deixa o dashboard pronto
                      para lançamentos e comparações mensais.
                    </div>
                  ) : null}

                  <FormError message={errorMessage} />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
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

export function PlanPartnerManager({ activePlan }: { activePlan: Plan | null }) {
  const { selectableUsers, selectedPartnerId, setSelectedPartnerId, savePartner, hasChanges } =
    usePartnerManager(activePlan)

  if (!activePlan) {
    return null
  }

  return (
    <Card className="border-border bg-secondary/60 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
        <Users size={16} /> Parceiro do Plano
      </h3>

      <Select value={selectedPartnerId} onChange={(event) => setSelectedPartnerId(event.target.value)}>
        <option value="">Sem parceiro</option>
        {selectableUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.email})
          </option>
        ))}
      </Select>

      <Button
        type="button"
        onClick={() => savePartner.mutate()}
        disabled={savePartner.isPending || !hasChanges}
        className="mt-3 h-11 w-full"
      >
        {savePartner.isPending ? "Salvando..." : "Salvar parceiro"}
      </Button>

      <div className="mt-2">
        <FormError
          message={savePartner.isError ? (savePartner.error as Error).message : null}
        />
      </div>
    </Card>
  )
}
