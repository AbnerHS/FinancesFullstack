import { createContext, useContext } from "react";

export const TransactionsPanelContext = createContext(null);

export const useTransactionsPanelContext = () => {
  const context = useContext(TransactionsPanelContext);

  if (!context) {
    throw new Error("TransactionsPanel context is not available.");
  }

  return context;
};
