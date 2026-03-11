import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "../services/transactionService";
import { invoiceService } from "../services/invoiceService";

const DEFAULT_TRANSACTION_FORM = {
  description: "",
  amount: "",
  type: "EXPENSE",
  responsibilityTag: "",
};

export const useTransactionsPanel = ({
  activePeriodId,
  userId,
  entries,
}) => {
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(DEFAULT_TRANSACTION_FORM);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingInvoiceForm, setEditingInvoiceForm] = useState({
    amount: "",
    creditCardId: "",
    periodId: "",
  });
  const [newTransaction, setNewTransaction] = useState(DEFAULT_TRANSACTION_FORM);
  const [, setPaymentModalEntry] = useState(null);

  const createTransaction = useMutation({
    mutationFn: async () => {
      if (!activePeriodId || !userId) {
        throw new Error("Periodo e usuario sao obrigatorios.");
      }
      const amountNumber = Number(newTransaction.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor valido.");
      }
      return transactionService.create({
        description: newTransaction.description,
        amount: amountNumber,
        type: newTransaction.type,
        periodId: activePeriodId,
        responsibleUserId: userId,
        responsibilityTag: newTransaction.responsibilityTag || null,
      });
    },
    onSuccess: async () => {
      setNewTransaction(DEFAULT_TRANSACTION_FORM);
      await queryClient.invalidateQueries({
        queryKey: ["period-transactions", activePeriodId],
      });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async () => {
      if (!editingId) {
        throw new Error("Transacao invalida.");
      }
      const payload = {
        description: editingForm.description,
        type: editingForm.type,
        responsibilityTag: editingForm.responsibilityTag || null,
      };
      if (editingForm.amount) {
        const amountNumber = Number(editingForm.amount);
        if (Number.isNaN(amountNumber) || amountNumber <= 0) {
          throw new Error("Informe um valor valido.");
        }
        payload.amount = amountNumber;
      }
      return transactionService.updatePartial(editingId, payload);
    },
    onSuccess: async () => {
      setEditingId(null);
      await queryClient.invalidateQueries({
        queryKey: ["period-transactions", activePeriodId],
      });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async () => {
      if (!editingInvoiceId) {
        throw new Error("Fatura invalida.");
      }
      const amountNumber = Number(editingInvoiceForm.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor valido.");
      }
      if (!editingInvoiceForm.creditCardId) {
        throw new Error("Selecione um cartao.");
      }
      return invoiceService.update(editingInvoiceId, {
        creditCardId: editingInvoiceForm.creditCardId,
        periodId: editingInvoiceForm.periodId,
        amount: amountNumber,
      });
    },
    onSuccess: async () => {
      setEditingInvoiceId(null);
      await queryClient.invalidateQueries({
        queryKey: ["period-invoices", activePeriodId],
      });
    },
  });

  const reorderTransactions = useMutation({
    mutationFn: async (orderedTransactions) => {
      if (!Array.isArray(orderedTransactions) || orderedTransactions.length === 0) {
        return [];
      }

      const updates = orderedTransactions.map((entry, index) => ({
        id: entry.id,
        order: index + 1,
        current: entry.order ?? null,
      }));

      const changed = updates.filter((item) => item.order !== item.current);
      if (changed.length === 0) {
        return [];
      }

      await Promise.all(
        changed.map((item) =>
          transactionService.updatePartial(item.id, { order: item.order })
        )
      );

      return changed;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["period-transactions", activePeriodId],
      });
    },
  });

  const canCreate = Boolean(activePeriodId);

  const summary = useMemo(() => {
    const incomes = entries
      .filter((t) => t.type === "REVENUE")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const expenses = entries
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    return { incomes, expenses, balance: incomes - expenses };
  }, [entries]);

  const startEditEntry = (entry) => {
    if (entry.kind === "INVOICE") {
      setEditingInvoiceId(entry.invoiceId);
      setEditingInvoiceForm({
        amount: entry.amount || "",
        creditCardId: entry.creditCardId || "",
        periodId: entry.periodId,
      });
      return;
    }
    setEditingId(entry.id);
    setEditingForm({
      description: entry.description || "",
      amount: entry.amount || "",
      type: entry.type || "EXPENSE",
      responsibilityTag: entry.responsibilityTag || "",
    });
  };

  const openPaymentModal = (entry) => {
    setPaymentModalEntry(entry);
  };

  return {
    editingId,
    editingForm,
    editingInvoiceId,
    editingInvoiceForm,
    newTransaction,
    createTransaction,
    updateTransaction,
    updateInvoice,
    reorderTransactions,
    canCreate,
    summary,
    setEditingForm,
    setEditingInvoiceForm,
    startEditEntry,
    setNewTransaction,
    openPaymentModal,
    setEditingId,
    setEditingInvoiceId,
  };
};
