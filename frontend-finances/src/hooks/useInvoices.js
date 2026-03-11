import { useQuery } from "@tanstack/react-query";
import { periodService } from "../services/periodService";

export const useInvoices = (periodOrPeriodId) => {
    const periodId = typeof periodOrPeriodId === 'string' ? periodOrPeriodId : periodOrPeriodId?.id;

    return useQuery({
        queryKey: ['period-invoices', periodId],
        queryFn: () => periodService.getInvoicesByPeriod(periodOrPeriodId),
        enabled: Boolean(periodOrPeriodId),
        staleTime: 1000 * 60 * 2,
    });
};
