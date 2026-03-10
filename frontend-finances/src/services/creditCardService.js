import { AxiosInstance } from "./AxiosInstance";

export const creditCardService = {
    getMyCreditCards: async () => {
        const response = await AxiosInstance.get('/users/me/credit-cards');
        return response.data?._embedded?.creditCards ?? [];
    },
};
