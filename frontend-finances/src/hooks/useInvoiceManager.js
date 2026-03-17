import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoiceService";
import { parseCurrencyInput } from "../utils/currency";

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Nao foi possivel criar a fatura.";

export const useInvoiceManager = ({
  creditCards,
  periods,
  selectedPeriodIds,
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    creditCardId: "",
    periodId: "",
    amount: "",
  });

  const resolvedForm = useMemo(() => {
    const hasCurrentCard = creditCards.some((card) => card.id === form.creditCardId);
    const hasCurrentPeriod = periods.some((period) => period.id === form.periodId);

    const preferredPeriodId = selectedPeriodIds?.[0] || periods[0]?.id || "";

    return {
      ...form,
      creditCardId: hasCurrentCard ? form.creditCardId : creditCards[0]?.id || "",
      periodId: hasCurrentPeriod ? form.periodId : preferredPeriodId,
    };
  }, [creditCards, form, periods, selectedPeriodIds]);

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!resolvedForm.creditCardId) {
        throw new Error("Selecione um cartao.");
      }
      if (!resolvedForm.periodId) {
        throw new Error("Selecione um periodo.");
      }

      const amountNumber = parseCurrencyInput(resolvedForm.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor valido.");
      }

      return invoiceService.create({
        creditCardId: resolvedForm.creditCardId,
        periodId: resolvedForm.periodId,
        amount: amountNumber,
      });
    },
    onSuccess: async () => {
      setForm((current) => ({ ...current, amount: "" }));
      await queryClient.invalidateQueries({ queryKey: ["period-invoices"] });
    },
  });

  const errorMessage = useMemo(
    () => (createInvoice.error ? getErrorMessage(createInvoice.error) : null),
    [createInvoice.error]
  );

  return {
    form: resolvedForm,
    setForm,
    createInvoice,
    errorMessage,
  };
};
