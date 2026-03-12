import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { creditCardService } from "../services/creditCardService";

const EMPTY_FORM = { name: "" };

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Nao foi possivel salvar o cartao.";

export const useCreditCardManager = ({ userId }) => {
  const queryClient = useQueryClient();
  const [editingCard, setEditingCard] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const resetForm = () => {
    setEditingCard(null);
    setForm(EMPTY_FORM);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Usuario nao encontrado.");
      }

      const name = form.name?.trim();
      if (!name) {
        throw new Error("Informe o nome do cartao.");
      }

      const payload = { name, userId };
      if (editingCard?.id) {
        return creditCardService.update(editingCard.id, payload);
      }
      return creditCardService.create(payload);
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["credit-cards-me"] });
    },
  });

  const startCreate = () => {
    setEditingCard(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (card) => {
    setEditingCard(card);
    setForm({ name: card?.name ?? "" });
  };

  const isEditing = Boolean(editingCard?.id);
  const errorMessage = useMemo(
    () => (saveMutation.error ? getErrorMessage(saveMutation.error) : null),
    [saveMutation.error]
  );

  return {
    form,
    setForm,
    editingCard,
    isEditing,
    saveMutation,
    errorMessage,
    startCreate,
    startEdit,
    cancelEdit: resetForm,
  };
};
