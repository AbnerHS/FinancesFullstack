import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

type DashboardStoreState = {
  selectedPlanId: string | null
  selectedPeriodIds: string[]
  setSelectedPlanId: (selectedPlanId: string | null) => void
  setSelectedPeriodIds: (
    nextOrUpdater: string[] | ((currentIds: string[]) => string[])
  ) => void,
  clearSelections: () => void
}

export const useDashboardStore = create<DashboardStoreState>()(
  persist(
    (set) => ({
      selectedPlanId: null,
      selectedPeriodIds: [],
      setSelectedPlanId: (selectedPlanId) => set({ selectedPlanId }),
      setSelectedPeriodIds: (nextOrUpdater) =>
        set((state) => {
          const next =
            typeof nextOrUpdater === "function"
              ? nextOrUpdater(state.selectedPeriodIds)
              : nextOrUpdater

          return { selectedPeriodIds: Array.isArray(next) ? next : [] }
        }),
      clearSelections: () => {
        set({ selectedPlanId: null, selectedPeriodIds: [] })
      }
    }),
    {
      name: "dashboard-selection",
      storage: createJSONStorage(() => localStorage),
    }
  )
)
