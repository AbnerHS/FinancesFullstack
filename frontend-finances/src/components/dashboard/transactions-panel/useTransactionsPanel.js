import { useTransactionsPanelContext } from "./transactionsPanelContext";

export const useTransactionsPanelState = () =>
  useTransactionsPanelContext().state;

export const useTransactionsPanelCommands = () =>
  useTransactionsPanelContext().commands;

export const useTransactionsPanelLookups = () =>
  useTransactionsPanelContext().lookups;
