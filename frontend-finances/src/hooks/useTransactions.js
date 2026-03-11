import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { periodService } from "../services/periodService";

export const useTransactions = (periodOrPeriodId) => {
    const periodId = typeof periodOrPeriodId === 'string' ? periodOrPeriodId : periodOrPeriodId?.id;

    return useQuery({
        queryKey: ['period-transactions', periodId],
        queryFn: () => periodService.getTransactionsByPeriod(periodOrPeriodId),
        enabled: Boolean(periodOrPeriodId),
        staleTime: 1000 * 60 * 2,
        placeholderData: keepPreviousData
    });
};
