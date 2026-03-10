import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { planService } from "../services/planService";

export const usePeriods = (planId) => {
    return useQuery({
        queryKey: ['plan-periods', planId],
        queryFn: () => planService.getPeriodsByPlan(planId),
        enabled: Boolean(planId),
        staleTime: 1000 * 60 * 5,
        placeholderData: keepPreviousData
    });
};
