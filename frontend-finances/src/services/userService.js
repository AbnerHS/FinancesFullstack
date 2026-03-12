import { AxiosInstance } from "../api/AxiosInstance";

export const userService = {
  getAll: async () => {
    const response = await AxiosInstance.get("/users");
    return response.data?._embedded?.users ?? [];
  },
  getById: async (id) => {
    if (!id) return null;
    const response = await AxiosInstance.get(`/users/${id}`);
    return response.data ?? null;
  },
};
