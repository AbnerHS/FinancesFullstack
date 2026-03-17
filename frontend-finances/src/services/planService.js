import { AxiosInstance } from "../api/AxiosInstance";
import { resolveLink } from "../utils/hateoas";

export const planService = {
    create: async (payload) => {
        const response = await AxiosInstance.post('/plans', payload);
        return response.data;
    },
    getMyPlans: async () => {
        const response = await AxiosInstance.get('/users/me/plans');
        return response.data?._embedded?.plans ?? [];
    },
    update: async (id, payload) => {
        const response = await AxiosInstance.put(`/plans/${id}`, payload);
        return response.data;
    },
    delete: async (id) => {
        await AxiosInstance.delete(`/plans/${id}`);
    },
    getPeriodsByPlan: async (planOrPlanId) => {
        const periodsPath =
            resolveLink(planOrPlanId?._links?.periods) ||
            resolveLink(planOrPlanId) ||
            (planOrPlanId ? `/plans/${planOrPlanId}/periods` : null);

        if (!periodsPath) {
            return [];
        }

        const response = await AxiosInstance.get(periodsPath);
        return response.data?._embedded?.periods ?? [];
    },
}
