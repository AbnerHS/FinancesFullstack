import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const localStorageProvider = () => localStorage;

export const useDashboardStore = create(
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
              : nextOrUpdater;
          return { selectedPeriodIds: Array.isArray(next) ? next : [] };
        }),
    }),
    {
      name: "dashboard-selection",
      storage: createJSONStorage(localStorageProvider),
    }
  )
);
