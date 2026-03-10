import { AxiosInstance } from "./AxiosInstance";

export const transactionService = {
    create: async (payload) => {
        const response = await AxiosInstance.post('/transactions', payload);
        return response.data;
    },
    updatePartial: async (id, payload) => {
        const response = await AxiosInstance.patch(`/transactions/${id}`, payload);
        return response.data;
    },
};
