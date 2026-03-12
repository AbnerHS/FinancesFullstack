import { AxiosInstance } from '../api/AxiosInstance';

export const invoiceService = {
    create: async (payload) => {
        const response = await AxiosInstance.post('/credit-card-invoices', payload);
        return response.data;
    },
    update: async (id, payload) => {
        const response = await AxiosInstance.put(`/credit-card-invoices/${id}`, payload);
        return response.data;
    },
};
