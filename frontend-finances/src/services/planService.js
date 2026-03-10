import { AxiosInstance } from "./AxiosInstance";

export const planService = {
    getMyPlans: async () => {
        const response = await AxiosInstance.get('/users/me/plans');
        return response.data?._embedded?.plans ?? [];
    },
    getPeriodsByPlan: async (planId) => {
        const response = await AxiosInstance.get(`/plans/${planId}/periods`);
        return response.data?._embedded?.periods ?? [];
    },
}
