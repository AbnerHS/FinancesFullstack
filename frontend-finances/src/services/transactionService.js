import { AxiosInstance } from '../api/AxiosInstance';

export const transactionService = {
    create: async (payload) => {
        const response = await AxiosInstance.post('/transactions', payload);
        return response.data;
    },
    createRecurring: async (payload) => {
        const response = await AxiosInstance.post('/transactions/recurring', payload);
        return response.data;
    },
    updatePartial: async (id, payload) => {
        const response = await AxiosInstance.patch(`/transactions/${id}`, payload);
        return response.data;
    },
    delete: async (id) => {
        await AxiosInstance.delete(`/transactions/${id}`);
    },
};
