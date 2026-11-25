import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { useDashboard, type PeriodPanel } from "@/features/finance/hooks.ts"
import { ForecastsCard } from "@/features/finance/forecasts-card.tsx"
import { DashboardPlanQuickCreate } from "@/features/finance/managers.tsx"
import { MonthCarousel } from "@/features/finance/month-carousel.tsx"
import { MonthPickerDialog } from "@/features/finance/month-picker.tsx"
import { MonthSummary } from "@/features/finance/month-summary.tsx"
import { ResponsibleFilter } from "@/features/finance/period-filters.tsx"
import {
  TransactionsWorkspace,
  TransactionsWorkspaceSkeleton,
} from "@/features/finance/transactions-workspace.tsx"
import { filterPanelsByResponsible } from "@/features/finance/utils.ts"

/**
 * Dashboard do dia a dia: um mês por vez (resumo + transações). A comparação entre meses fica na
 * tela de evolução.
 */
export function DashboardPage() {
  const {
    plans,
    plansLoading,
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
    monthSummaries,
  } = useDashboard()
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const openMonthPicker = useCallback(() => setMonthPickerOpen(true), [])
  const closeMonthPicker = useCallback(() => setMonthPickerOpen(false), [])
  const monthsWithData = useMemo(
    () => monthSummaries.map((summary) => summary.month),
    [monthSummaries]
  )
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
      {/* O plano se escolhe (e se cria) pelo cabeçalho e pela tela Planos; o mês, no carrossel.
          Aqui só o filtro de responsável, em pílulas, sempre à vista. */}
      <section className="app-panel p-4 sm:p-5" aria-label="Filtro por responsável">
        {plans.length > 0 ? (
          <ResponsibleFilter
            responsibleOptions={responsibleOptions}
            responsibleFilter={responsibleFilter}
            onResponsibleChange={setResponsibleFilter}
          />
        ) : (
          <DashboardPlanQuickCreate
            activePlan={activePlan}
            hasPlans={false}
            onSelectPlanId={setSelectedPlanId}
            userId={userId}
          />
        )}

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
      </section>

      <KeepHeightWhileLoading
        loading={Boolean(activePanel?.transactionsLoading || activePanel?.invoicesLoading)}
      >
        <MonthSummary
          panel={activePanel}
          responsibleFilter={responsibleFilter}
          onGoToCurrentMonth={goToCurrentMonth}
          onOpenMonthPicker={openMonthPicker}
        />
      </KeepHeightWhileLoading>

      {activePanel ? (
        <ForecastsCard
          planId={activePlan?.id ?? null}
          monthId={activePanel.period.id}
          forecast={activePanel.forecast}
          forecasts={activePanel.forecasts ?? []}
          categories={transactionCategories}
          responsibleOptions={responsibleOptions}
        />
      ) : null}

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
            onLabelClick={openMonthPicker}
          />
        )}
      </section>

      {activePeriod ? (
        <MonthPickerDialog
          open={monthPickerOpen}
          value={activePeriod.id}
          monthsWithData={monthsWithData}
          onSelect={setSelectedMonthId}
          onClose={closeMonthPicker}
        />
      ) : null}
    </div>
  )
}

/**
 * Mantém a altura do último conteúdo carregado enquanto o próximo carrega (o esqueleto é mais
 * baixo): sem isso a página encolhia acima do carrossel e a rolagem pulava.
 */
function KeepHeightWhileLoading({ loading, children }: { loading: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [loadedHeight, setLoadedHeight] = useState<number | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || loading) return
    const observer = new ResizeObserver(() => setLoadedHeight(node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading])

  return (
    <div ref={ref} style={loading && loadedHeight ? { minHeight: loadedHeight } : undefined}>
      {children}
    </div>
  )
}
