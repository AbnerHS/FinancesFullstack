import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { planService } from "../services/planService";

export const usePeriods = (planOrPlanId) => {
    const planId = typeof planOrPlanId === 'string' ? planOrPlanId : planOrPlanId?.id;

    return useQuery({
        queryKey: ['plan-periods', planId],
        queryFn: () => planService.getPeriodsByPlan(planOrPlanId),
        enabled: Boolean(planOrPlanId),
        staleTime: 1000 * 60 * 5,
        placeholderData: keepPreviousData
    });
};
