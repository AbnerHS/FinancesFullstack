import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { periodService } from "../services/periodService";

export const useTransactions = (periodId) => {
    return useQuery({
        queryKey: ['period-transactions', periodId],
        queryFn: () => periodService.getTransactionsByPeriod(periodId),
        enabled: Boolean(periodId),
        staleTime: 1000 * 60 * 2,
        placeholderData: keepPreviousData
    });
};
