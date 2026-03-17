import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";

import { userService } from "../services/userService";
import { useAuthStore } from "../store/authStore";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const useProfileSettings = () => {
  const { user, setUser } = useAuthStore();

  const profileMutation = useMutation({
    mutationFn: userService.updateMe,
    onSuccess: (updatedUser) => {
      setUser({ user: updatedUser });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: userService.updatePassword,
  });

  return {
    user,
    profileMutation,
    passwordMutation,
    profileError: useMemo(
      () =>
        profileMutation.error
          ? getErrorMessage(profileMutation.error, "Nao foi possivel atualizar o perfil.")
          : null,
      [profileMutation.error]
    ),
    passwordError: useMemo(
      () =>
        passwordMutation.error
          ? getErrorMessage(passwordMutation.error, "Nao foi possivel atualizar a senha.")
          : null,
      [passwordMutation.error]
    ),
  };
};
