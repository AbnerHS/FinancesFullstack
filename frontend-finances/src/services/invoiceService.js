import { AxiosInstance } from '../api/AxiosInstance';

export const invoiceService = {
    update: async (id, payload) => {
        const response = await AxiosInstance.put(`/credit-card-invoices/${id}`, payload);
        return response.data;
    },
};
