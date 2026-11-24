import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

// Os ids de início/fim são meses no formato AAAA-MM.
type DashboardPeriodRange = {
  startPeriodId: string | null
  endPeriodId: string | null
}

/** Mês aberto no dashboard: o escolhido, se válido, ou o mês atual. */
export function resolveActiveMonthId(selectedMonthId: string | null, today = new Date()) {
  if (selectedMonthId && /^\d{4}-\d{2}$/.test(selectedMonthId)) return selectedMonthId
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
}

type DashboardStoreState = {
  selectedPlanId: string | null
  /** Mês do dashboard (AAAA-MM). Não é salvo: cada visita abre no mês atual. */
  selectedMonthId: string | null
  /** Filtro de responsável compartilhado entre dashboard e evolução (não é salvo). */
  responsibleFilter: string
  selectedStartPeriodId: string | null
  selectedEndPeriodId: string | null
  /**
   * Pedido de "nova transação" vindo de fora do painel do mês (atalho N, botão + do celular). O
   * painel do mês ativo abre o formulário e limpa o pedido.
   */
  composerRequested: boolean
  requestComposer: () => void
  consumeComposerRequest: () => void
  setSelectedPlanId: (selectedPlanId: string | null) => void
  setSelectedMonthId: (selectedMonthId: string | null) => void
  setResponsibleFilter: (responsibleFilter: string) => void
  setSelectedPeriodRange: (
    nextOrUpdater:
      | DashboardPeriodRange
      | ((currentRange: DashboardPeriodRange) => DashboardPeriodRange)
  ) => void,
  clearSelections: () => void
}

export const useDashboardStore = create<DashboardStoreState>()(
  persist(
    (set) => ({
      selectedPlanId: null,
      selectedMonthId: null,
      responsibleFilter: "",
      selectedStartPeriodId: null,
      selectedEndPeriodId: null,
      composerRequested: false,
      requestComposer: () => set({ composerRequested: true }),
      consumeComposerRequest: () => set({ composerRequested: false }),
      setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
      setSelectedMonthId: (selectedMonthId) => set({ selectedMonthId }),
      setResponsibleFilter: (responsibleFilter) => set({ responsibleFilter }),
      setSelectedPeriodRange: (nextOrUpdater) =>
        set((state) => {
          const next =
            typeof nextOrUpdater === "function"
              ? nextOrUpdater({
                  startPeriodId: state.selectedStartPeriodId,
                  endPeriodId: state.selectedEndPeriodId,
                })
              : nextOrUpdater

          return {
            selectedStartPeriodId: next.startPeriodId ?? null,
            selectedEndPeriodId: next.endPeriodId ?? null,
          }
        }),
      clearSelections: () => {
        set({
          selectedPlanId: null,
          selectedMonthId: null,
          responsibleFilter: "",
          selectedStartPeriodId: null,
          selectedEndPeriodId: null,
        })
      }
    }),
    {
      // Ids salvos antes da migração (UUIDs de período) não batem com nenhum mês e são
      // trocados pelo mês padrão em useDashboard; o plano selecionado é preservado.
      name: "dashboard-selection",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedPlanId: state.selectedPlanId,
        selectedStartPeriodId: state.selectedStartPeriodId,
        selectedEndPeriodId: state.selectedEndPeriodId,
      }),
    }
  )
)
