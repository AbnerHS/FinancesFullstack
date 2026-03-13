import { AxiosInstance } from "../api/AxiosInstance";

export const transactionCategoryService = {
  getAll: async () => {
    const response = await AxiosInstance.get("/transaction-categories");
    return response.data?._embedded?.transactionCategories ?? [];
  },
  create: async (payload) => {
    const response = await AxiosInstance.post("/transaction-categories", payload);
    return response.data;
  },
};
