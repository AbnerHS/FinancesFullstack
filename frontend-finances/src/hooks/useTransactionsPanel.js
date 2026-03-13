import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "../services/transactionService";
import { transactionCategoryService } from "../services/transactionCategoryService";
import { invoiceService } from "../services/invoiceService";
import { periodService } from "../services/periodService";

const DEFAULT_TRANSACTION_FORM = {
  description: "",
  amount: "",
  type: "EXPENSE",
  categoryId: "",
  categoryName: "",
  responsibleUserId: "",
  isRecurring: false,
  numberOfPeriods: 2,
};

export const useTransactionsPanel = ({
  activePeriodId,
  userId,
  entries,
  periods,
  transactionCategories,
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
  const [paymentModalEntry, setPaymentModalEntry] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [editingScope, setEditingScope] = useState("SINGLE");
  const [deleteTransactionErrorId, setDeleteTransactionErrorId] = useState(null);

  const ensureCategory = async ({ categoryId, categoryName }) => {
    const normalizedName = categoryName?.trim() || "";

    if (!categoryId && !normalizedName) {
      return null;
    }

    const existingById = transactionCategories.find((category) => category.id === categoryId);
    if (existingById) {
      return { id: existingById.id, name: existingById.name };
    }

    const existingByName = transactionCategories.find(
      (category) => category.name?.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (existingByName) {
      return { id: existingByName.id, name: existingByName.name };
    }

    const createdCategory = await transactionCategoryService.create({ name: normalizedName });
    await queryClient.invalidateQueries({ queryKey: ["transaction-categories"] });
    return {
      id: createdCategory.id,
      name: createdCategory.name,
    };
  };

  const createTransaction = useMutation({
    mutationFn: async () => {
      if (!activePeriodId || !userId) {
        throw new Error("Periodo e usuario sao obrigatorios.");
      }
      const amountNumber = Number(newTransaction.amount);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error("Informe um valor valido.");
      }
      const category = await ensureCategory(newTransaction);
      const basePayload = {
        description: newTransaction.description,
        amount: amountNumber,
        type: newTransaction.type,
        periodId: activePeriodId,
        responsibleUserId: newTransaction.responsibleUserId || null,
        category,
      };

      if (!newTransaction.isRecurring) {
        return transactionService.create(basePayload);
      }

      const periodsNumber = Number(newTransaction.numberOfPeriods);
      if (Number.isNaN(periodsNumber) || periodsNumber < 2) {
        throw new Error("Informe pelo menos 2 periodos para recorrencia.");
      }

      return transactionService.createRecurring({
        transaction: basePayload,
        numberOfPeriods: periodsNumber,
      });
    },
    onSuccess: async () => {
      setNewTransaction(DEFAULT_TRANSACTION_FORM);
      await queryClient.invalidateQueries({ queryKey: ["period-transactions"] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async () => {
      if (!editingId) {
        throw new Error("Transacao invalida.");
      }
      const category = await ensureCategory(editingForm);
      const payload = {
        description: editingForm.description,
        type: editingForm.type,
        category,
        responsibleUserId: editingForm.responsibleUserId || null,
      };

      if (editingForm.amount) {
        const amountNumber = Number(editingForm.amount);
        if (Number.isNaN(amountNumber) || amountNumber <= 0) {
          throw new Error("Informe um valor valido.");
        }
        payload.amount = amountNumber;
      }

      if (editingScope === "SINGLE" || !editingForm.recurringGroupId) {
        return transactionService.updatePartial(editingId, payload);
      }

      const periodList = Array.isArray(periods) ? periods : [];
      if (periodList.length === 0) {
        throw new Error("Nao foi possivel carregar os periodos para editar em grupo.");
      }

      const transactionsByPeriod = await Promise.all(
        periodList.map((period) => periodService.getTransactionsByPeriod(period))
      );

      const recurringTransactions = transactionsByPeriod
        .flat()
        .filter(
          (transaction) => transaction.recurringGroupId === editingForm.recurringGroupId
        );

      if (recurringTransactions.length === 0) {
        throw new Error("Nenhuma transacao recorrente encontrada para este grupo.");
      }

      await Promise.all(
        recurringTransactions.map((transaction) =>
          transactionService.updatePartial(transaction.id, payload)
        )
      );

      return recurringTransactions;
    },
    onSuccess: async () => {
      setEditingId(null);
      setEditingScope("SINGLE");
      await queryClient.invalidateQueries({ queryKey: ["period-transactions"] });
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

  const linkTransactionToInvoice = useMutation({
    mutationFn: async () => {
      if (!paymentModalEntry?.id) {
        throw new Error("Transacao invalida.");
      }
      if (!selectedInvoiceId) {
        throw new Error("Selecione uma fatura.");
      }

      return transactionService.updatePartial(paymentModalEntry.id, {
        isClearedByInvoice: true,
        creditCardInvoiceId: selectedInvoiceId,
      });
    },
    onSuccess: async () => {
      setPaymentModalEntry(null);
      setSelectedInvoiceId("");
      await queryClient.invalidateQueries({
        queryKey: ["period-transactions", activePeriodId],
      });
    },
  });

  const deleteTransaction = useMutation({
    onMutate: (entry) => {
      setDeleteTransactionErrorId(entry?.id || null);
    },
    mutationFn: async (entry) => {
      if (!entry?.id) {
        throw new Error("Transacao invalida.");
      }

      const confirmed = window.confirm(
        `Deseja excluir a transacao "${entry.description || "sem descricao"}"?`
      );

      if (!confirmed) {
        return null;
      }

      await transactionService.delete(entry.id);
      return entry.id;
    },
    onSuccess: async (deletedId) => {
      if (!deletedId) {
        setDeleteTransactionErrorId(null);
        return;
      }

      if (editingId === deletedId) {
        setEditingId(null);
        setEditingScope("SINGLE");
      }

      await queryClient.invalidateQueries({
        queryKey: ["period-transactions", activePeriodId],
      });
      setDeleteTransactionErrorId(null);
    },
    onError: (_error, entry) => {
      setDeleteTransactionErrorId(entry?.id || null);
    },
  });

  const canCreate = Boolean(activePeriodId);

  const summary = useMemo(() => {
    const incomes = entries
      .filter((t) => t.type === "REVENUE")
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const expenses = entries
      .filter((t) => t.type === "EXPENSE" && !t.isClearedByInvoice)
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
      categoryId: entry.category?.id || "",
      categoryName: entry.category?.name || "",
      responsibleUserId: entry.responsibleUserId || "",
      recurringGroupId: entry.recurringGroupId || null,
    });
    setEditingScope("SINGLE");
  };

  const openPaymentModal = (entry) => {
    setPaymentModalEntry(entry);
    setSelectedInvoiceId(entry?.creditCardInvoiceId || "");
  };

  const closePaymentModal = () => {
    setPaymentModalEntry(null);
    setSelectedInvoiceId("");
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
    linkTransactionToInvoice,
    canCreate,
    summary,
    setEditingForm,
    setEditingInvoiceForm,
    startEditEntry,
    setNewTransaction,
    openPaymentModal,
    closePaymentModal,
    paymentModalEntry,
    selectedInvoiceId,
    setSelectedInvoiceId,
    editingScope,
    setEditingScope,
    deleteTransactionErrorId,
    deleteTransaction,
    setEditingId,
    setEditingInvoiceId,
  };
};
