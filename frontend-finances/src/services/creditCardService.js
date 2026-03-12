import { AxiosInstance } from '../api/AxiosInstance';

export const creditCardService = {
    getMyCreditCards: async () => {
        const response = await AxiosInstance.get('/users/me/credit-cards');
        return response.data?._embedded?.creditCards ?? [];
    },
    create: async (payload) => {
        const response = await AxiosInstance.post('/credit-cards', payload);
        return response.data;
    },
    update: async (id, payload) => {
        const response = await AxiosInstance.put(`/credit-cards/${id}`, payload);
        return response.data;
    },
};
