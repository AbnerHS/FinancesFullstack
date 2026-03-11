import { AxiosInstance } from "../api/AxiosInstance";
import { resolveLink } from "../utils/hateoas";

export const periodService = {
    getTransactionsByPeriod: async (periodOrPeriodId) => {
        const transactionsPath =
            resolveLink(periodOrPeriodId?._links?.transactions) ||
            resolveLink(periodOrPeriodId) ||
            (periodOrPeriodId ? `/periods/${periodOrPeriodId}/transactions` : null);

        if (!transactionsPath) {
            return [];
        }

        const response = await AxiosInstance.get(transactionsPath);
        return response.data?._embedded?.transactions ?? [];
    },
    getInvoicesByPeriod: async (periodOrPeriodId) => {
        const invoicesPath =
            resolveLink(periodOrPeriodId?._links?.invoices) ||
            resolveLink(periodOrPeriodId) ||
            (periodOrPeriodId ? `/periods/${periodOrPeriodId}/invoices` : null);

        if (!invoicesPath) {
            return [];
        }

        const response = await AxiosInstance.get(invoicesPath);
        return response.data?._embedded?.invoices ?? [];
    },
};
