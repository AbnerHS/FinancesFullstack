import { useQuery } from "@tanstack/react-query";
import { periodService } from "../services/periodService";

export const useInvoices = (periodId) => {
    return useQuery({
        queryKey: ['period-invoices', periodId],
        queryFn: () => periodService.getInvoicesByPeriod(periodId),
        enabled: Boolean(periodId),
        staleTime: 1000 * 60 * 2,
    });
};
