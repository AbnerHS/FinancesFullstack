import { AxiosInstance } from "../api/AxiosInstance";

export const reportService = {
  getSpendingByCategory: async (periodId) => {
    if (!periodId) {
      return [];
    }

    const response = await AxiosInstance.get("/reports/spending-by-category", {
      params: { periodId },
    });

    return response.data ?? [];
  },
};
