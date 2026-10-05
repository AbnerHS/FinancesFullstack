import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

// Os ids de início/fim são meses no formato AAAA-MM.
type DashboardPeriodRange = {
  startPeriodId: string | null
  endPeriodId: string | null
}

type DashboardStoreState = {
  selectedPlanId: string | null
  /** Mês do dashboard (AAAA-MM). Não é salvo: cada visita abre no mês atual. */
  selectedMonthId: string | null
  /** Filtro de responsável compartilhado entre dashboard e evolução (não é salvo). */
  responsibleFilter: string
  selectedStartPeriodId: string | null
  selectedEndPeriodId: string | null
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
