import { useCallback, useMemo } from "react"

import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { useDashboard, type PeriodPanel } from "@/features/finance/hooks.ts"
import { DashboardPlanQuickCreate } from "@/features/finance/managers.tsx"
import { MonthCarousel } from "@/features/finance/month-carousel.tsx"
import { MonthSummary } from "@/features/finance/month-summary.tsx"
import {
  FiltersPanel,
  PlanResponsibleSelects,
} from "@/features/finance/period-filters.tsx"
import {
  TransactionsWorkspace,
  TransactionsWorkspaceSkeleton,
} from "@/features/finance/transactions-workspace.tsx"
import {
  filterPanelsByResponsible,
  formatMonthYear,
} from "@/features/finance/utils.ts"

/**
 * Dashboard do dia a dia: um mês por vez (resumo + transações). A comparação entre meses fica na
 * tela de evolução.
 */
export function DashboardPage() {
  const {
    plans,
    plansLoading,
    selectedPlanId,
    activePlan,
    setSelectedPlanId,
    activePeriod,
    setSelectedMonthId,
    goToCurrentMonth,
    periodPanels,
    creditCards,
    transactionCategories,
    responsibleOptions,
    userId,
  } = useDashboard()
  const responsibleFilter = useDashboardStore((state) => state.responsibleFilter)
  const setResponsibleFilter = useDashboardStore((state) => state.setResponsibleFilter)

  // Referências estáveis: com elas os painéis (memo) não re-renderizam quando só o mês ativo muda.
  const workspaceShared = useMemo(
    () => ({ creditCards, transactionCategories, responsibleOptions }),
    [creditCards, transactionCategories, responsibleOptions]
  )
  // Mês carregando ou longe do visível: esqueleto leve. O painel completo só monta quando os dados
  // chegam e o mês está ao alcance do swipe, então a navegação não espera nem rede nem render.
  const renderPanel = useCallback(
    (panel: PeriodPanel, near: boolean) =>
      near && !panel.transactionsLoading && !panel.invoicesLoading ? (
        <TransactionsWorkspace panel={panel} shared={workspaceShared} />
      ) : (
        <TransactionsWorkspaceSkeleton label={panel.label} />
      ),
    [workspaceShared]
  )

  const filteredPanels = useMemo(
    () => filterPanelsByResponsible(periodPanels, responsibleFilter),
    [periodPanels, responsibleFilter]
  )
  const activePanel =
    filteredPanels.find((panel) => panel.period.id === activePeriod?.id) ?? null

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <FiltersPanel
        title={activePlan?.name || "Sem plano"}
        subtitle={activePeriod ? formatMonthYear(activePeriod) : "Sem plano"}
      >
        {/* O mês se escolhe no carrossel (setas, swipe, teclado), sem limite de intervalo. */}
        <div className="grid gap-4 md:grid-cols-2">
          <PlanResponsibleSelects
            plans={plans}
            selectedPlanId={selectedPlanId}
            onPlanChange={setSelectedPlanId}
            responsibleOptions={responsibleOptions}
            responsibleFilter={responsibleFilter}
            onResponsibleChange={setResponsibleFilter}
          />
        </div>

        <div className="mt-4">
          <DashboardPlanQuickCreate
            activePlan={activePlan}
            hasPlans={plans.length > 0}
            onSelectPlanId={setSelectedPlanId}
            userId={userId}
          />
        </div>

        {plans.length === 0 ? (
          <div className="mt-4 rounded-[1.5rem] border border-dashed border-border bg-secondary/50 px-5 py-4">
            <p className="font-semibold text-foreground">
              Seu dashboard começa por um plano financeiro.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie seu primeiro plano para liberar meses, transações, categorias e cartões.
            </p>
          </div>
        ) : null}
      </FiltersPanel>

      <MonthSummary
        panel={activePanel}
        responsibleFilter={responsibleFilter}
        onGoToCurrentMonth={goToCurrentMonth}
      />

      <section className="space-y-3" aria-label="Transações do mês">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            Transações
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deslize para o mês anterior ou o próximo. Arraste pela alça para reordenar.
          </p>
        </div>

        {filteredPanels.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-secondary/60 px-6 py-10 text-sm text-muted-foreground">
            Crie um plano para começar a lançar transações.
          </div>
        ) : (
          <MonthCarousel
            panels={filteredPanels}
            activeId={activePeriod?.id ?? null}
            onActiveIdChange={setSelectedMonthId}
            renderPanel={renderPanel}
          />
        )}
      </section>
    </div>
  )
}
