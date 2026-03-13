import { TransactionsPanelProvider } from "./transactions-panel/TransactionsPanelProvider";
import { TransactionsPanelShell } from "./transactions-panel/TransactionsPanelShell";

export const TransactionsPanel = ({ panel, shared }) => (
  <TransactionsPanelProvider panel={panel} shared={shared}>
    <TransactionsPanelShell />
  </TransactionsPanelProvider>
);
