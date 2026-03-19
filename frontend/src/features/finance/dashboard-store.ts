import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type DashboardPeriodRange = {
  startPeriodId: string | null
  endPeriodId: string | null
}

type DashboardStoreState = {
  selectedPlanId: string | null
  selectedStartPeriodId: string | null
  selectedEndPeriodId: string | null
  selectedPeriodIds: string[]
  setSelectedPlanId: (selectedPlanId: string | null) => void
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
      selectedStartPeriodId: null,
      selectedEndPeriodId: null,
      selectedPeriodIds: [],
      setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
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
          selectedStartPeriodId: null,
          selectedEndPeriodId: null,
          selectedPeriodIds: [],
        })
      }
    }),
    {
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
