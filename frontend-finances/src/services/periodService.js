import { AxiosInstance } from "./AxiosInstance";

export const periodService = {
    getTransactionsByPeriod: async (periodId) => {
        const response = await AxiosInstance.get(`/periods/${periodId}/transactions`);
        return response.data?._embedded?.transactions ?? [];
    },
    getInvoicesByPeriod: async (periodId) => {
        const response = await AxiosInstance.get(`/periods/${periodId}/invoices`);
        return response.data?._embedded?.invoices ?? [];
    },
};
