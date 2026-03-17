import { AxiosInstance } from "../api/AxiosInstance";

export const userService = {
  getMe: async () => {
    const response = await AxiosInstance.get("/users/me");
    return response.data ?? null;
  },
  getAll: async () => {
    const response = await AxiosInstance.get("/users");
    return response.data?._embedded?.users ?? [];
  },
  getById: async (id) => {
    if (!id) return null;
    const response = await AxiosInstance.get(`/users/${id}`);
    return response.data ?? null;
  },
  updateMe: async (payload) => {
    const response = await AxiosInstance.patch("/users/me", payload);
    return response.data ?? null;
  },
  updatePassword: async (payload) => {
    await AxiosInstance.put("/users/me/password", payload);
  },
};
