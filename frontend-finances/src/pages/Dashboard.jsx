import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlans } from "../hooks/usePlans";
import { usePeriods } from "../hooks/usePeriods";
import { useTransactions } from "../hooks/useTransactions";
import { useInvoices } from "../hooks/useInvoices";
import { useCreditCards } from "../hooks/useCreditCards";
import { Wallet, Calendar, ArrowUpCircle, ArrowDownCircle, Plus } from "lucide-react";
import { transactionService } from "../services/transactionService";
import { invoiceService } from "../services/invoiceService";
import { useAuthStore } from "../store/authStore";

const Dashboard = () => {
    const { data: plans = [], isLoading } = usePlans();
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editingForm, setEditingForm] = useState({ description: "", amount: "", type: "EXPENSE", responsibilityTag: "" });
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);
    const [editingInvoiceForm, setEditingInvoiceForm] = useState({ amount: "", creditCardId: "", periodId: "" });
    const [paymentEdits, setPaymentEdits] = useState({});
    const [newTransaction, setNewTransaction] = useState({ description: "", amount: "", type: "EXPENSE", responsibilityTag: "" });
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const activePlanId = selectedPlanId || plans[0]?.id;
    const { data: periods = [], isLoading: periodsLoading } = usePeriods(activePlanId);
    const activePeriodId = selectedPeriodId || periods[0]?.id;
    const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(activePeriodId);
    const { data: invoices = [], isLoading: invoicesLoading } = useInvoices(activePeriodId);
    const { data: creditCards = [] } = useCreditCards();

    const selectedPeriod = useMemo(() => periods.find(p => p.id === selectedPeriodId), [periods, selectedPeriodId]);

    const entries = useMemo(() => {
        const invoiceEntries = invoices.map((invoice) => ({
            id: `invoice-${invoice.id}`,
            kind: "INVOICE",
            description: "Fatura cartao",
            amount: invoice.amount,
            type: "EXPENSE",
            dateTime: "-",
            invoiceId: invoice.id,
            creditCardId: invoice.creditCardId,
            periodId: invoice.periodId,
        }));
        return [...transactions.map((t) => ({ ...t, kind: "TRANSACTION" })), ...invoiceEntries];
    }, [transactions, invoices]);

    const stats = useMemo(() => {
        const incomes = transactions
            .filter(t => t.type === "REVENUE")
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
        const expensesFromTransactions = transactions
            .filter(t => t.type === "EXPENSE" && !t.isClearedByInvoice)
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
        const expensesFromInvoices = invoices.reduce((acc, invoice) => acc + parseFloat(invoice.amount), 0);
        const expenses = expensesFromTransactions + expensesFromInvoices;
        return { incomes, expenses, balance: incomes - expenses };
    }, [transactions, invoices]);

    const createTransaction = useMutation({
        mutationFn: async () => {
            if (!activePeriodId || !user?.id) {
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
                responsibleUserId: user.id,
                responsibilityTag: newTransaction.responsibilityTag || null,
            });
        },
        onSuccess: async () => {
            setNewTransaction({ description: "", amount: "", type: "EXPENSE", responsibilityTag: "" });
            await queryClient.invalidateQueries({ queryKey: ['period-transactions', activePeriodId] });
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
            await queryClient.invalidateQueries({ queryKey: ['period-transactions', activePeriodId] });
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
            await queryClient.invalidateQueries({ queryKey: ['period-invoices', activePeriodId] });
        },
    });

    const updatePayment = useMutation({
        mutationFn: async ({ id, isClearedByInvoice, creditCardInvoiceId }) => {
            return transactionService.updatePartial(id, {
                isClearedByInvoice,
                creditCardInvoiceId: creditCardInvoiceId || null,
            });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['period-transactions', activePeriodId] });
        },
    });

    if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Visao Geral</h1>
                    <p className="text-gray-500">Gerencie seus planos e fluxos de caixa.</p>
                </div>
                <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition">
                    <Plus size={20} /> Novo Plano
                </button>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatCard title="Saldo do Periodo" value={stats.balance} icon={<Wallet className="text-indigo-600" />} color="indigo" />
                <StatCard title="Receitas" value={stats.incomes} icon={<ArrowUpCircle className="text-emerald-600" />} color="emerald" />
                <StatCard title="Despesas" value={stats.expenses} icon={<ArrowDownCircle className="text-rose-600" />} color="rose" />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <aside className="space-y-6 lg:col-span-4">
                    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Meus Planos</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {plans.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                        plan.id === selectedPlanId 
                                        ? "bg-indigo-600 text-white shadow-md" 
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {plan.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                        <h3 className="mb-4 font-bold text-gray-800 uppercase text-xs tracking-wider flex items-center gap-2">
                            <Calendar size={16} /> Periodos Disponiveis
                        </h3>
                        {periodsLoading ? (
                            <div className="text-sm text-gray-400">Carregando periodos...</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {periods.map((period) => (
                                    <button
                                        key={period.id}
                                        onClick={() => setSelectedPeriodId(period.id)}
                                        className={`flex flex-col p-3 rounded-lg border text-left transition ${
                                            period.id === selectedPeriodId
                                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                                            : "border-gray-100 bg-white hover:border-emerald-200"
                                        }`}
                                    >
                                        <span className="text-sm font-bold text-gray-700">
                                            {String(period.month).padStart(2, "0")}/{period.year}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                <main className="lg:col-span-8">
                    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                        <div className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">Historico de Transacoes</h3>
                            {selectedPeriod && (
                                <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                                    {String(selectedPeriod.month).padStart(2, '0')}/{selectedPeriod.year}
                                </span>
                            )}
                        </div>

                        <div className="border-b border-gray-100 p-5">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Lancar transacao</h4>
                            <div className="grid gap-3 md:grid-cols-5">
                                <input
                                    className="rounded border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Descricao"
                                    value={newTransaction.description}
                                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, description: e.target.value }))}
                                />
                                <input
                                    className="rounded border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Valor"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newTransaction.amount}
                                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, amount: e.target.value }))}
                                />
                                <select
                                    className="rounded border border-gray-200 px-3 py-2 text-sm"
                                    value={newTransaction.type}
                                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="REVENUE">Receita</option>
                                    <option value="EXPENSE">Despesa</option>
                                </select>
                                <input
                                    className="rounded border border-gray-200 px-3 py-2 text-sm"
                                    placeholder="Tag (opcional)"
                                    value={newTransaction.responsibilityTag}
                                    onChange={(e) => setNewTransaction((prev) => ({ ...prev, responsibilityTag: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => createTransaction.mutate()}
                                    disabled={createTransaction.isPending || !activePeriodId}
                                    className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Lancar
                                </button>
                            </div>
                            {!activePeriodId && (
                                <p className="mt-2 text-xs text-gray-500">Selecione um periodo para lancar transacoes.</p>
                            )}
                            {createTransaction.isError && (
                                <p className="mt-2 text-xs text-rose-600">{createTransaction.error.message}</p>
                            )}
                        </div>

                        <div className="p-0">
                            {transactionsLoading || invoicesLoading ? (
                                <div className="p-10 text-center text-gray-400">Carregando dados...</div>
                            ) : entries.length === 0 ? (
                                <div className="p-10 text-center text-gray-400 italic">
                                    Nenhuma transacao para este periodo.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-xs uppercase text-gray-400 bg-gray-50/30">
                                            <th className="px-6 py-3 font-medium">Descricao</th>
                                            <th className="px-6 py-3 font-medium text-right">Valor</th>
                                            <th className="px-6 py-3 font-medium text-center">Tipo</th>
                                            <th className="px-6 py-3 font-medium text-center">Pagamento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {entries.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4">
                                                    {editingId === t.id && t.kind !== "INVOICE" ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                                value={editingForm.description}
                                                                onChange={(e) => setEditingForm((prev) => ({ ...prev, description: e.target.value }))}
                                                            />
                                                            <input
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={editingForm.amount}
                                                                onChange={(e) => setEditingForm((prev) => ({ ...prev, amount: e.target.value }))}
                                                            />
                                                            <select
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                                value={editingForm.type}
                                                                onChange={(e) => setEditingForm((prev) => ({ ...prev, type: e.target.value }))}
                                                            >
                                                                <option value="REVENUE">Receita</option>
                                                                <option value="EXPENSE">Despesa</option>
                                                            </select>
                                                            <input
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                                placeholder="Tag (opcional)"
                                                                value={editingForm.responsibilityTag}
                                                                onChange={(e) => setEditingForm((prev) => ({ ...prev, responsibilityTag: e.target.value }))}
                                                            />
                                                        </div>
                                                    ) : editingInvoiceId === t.invoiceId ? (
                                                        <div className="space-y-2">
                                                            <input
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={editingInvoiceForm.amount}
                                                                onChange={(e) => setEditingInvoiceForm((prev) => ({ ...prev, amount: e.target.value }))}
                                                            />
                                                            <select
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                                                                value={editingInvoiceForm.creditCardId}
                                                                onChange={(e) => setEditingInvoiceForm((prev) => ({ ...prev, creditCardId: e.target.value }))}
                                                            >
                                                                <option value="">Selecione o cartao</option>
                                                                {creditCards.map((card) => (
                                                                    <option key={card.id} value={card.id}>{card.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="font-medium text-gray-900">{t.description}</p>
                                                            <p className="text-xs text-gray-400">{t.dateTime}</p>
                                                        </>
                                                    )}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${
                                                    t.type === "REVENUE" ? "text-emerald-600" : "text-rose-600"
                                                }`}>
                                                    {t.type === "REVENUE" ? "+" : "-"} R$ {parseFloat(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {editingId === t.id && t.kind !== "INVOICE" ? (
                                                        <div className="space-y-2">
                                                            <button
                                                                type="button"
                                                                className="w-full rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                                                                onClick={() => updateTransaction.mutate()}
                                                                disabled={updateTransaction.isPending}
                                                            >
                                                                Salvar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="w-full rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                                                                onClick={() => setEditingId(null)}
                                                            >
                                                                Cancelar
                                                            </button>
                                                            {updateTransaction.isError && (
                                                                <p className="text-[10px] text-rose-600">{updateTransaction.error.message}</p>
                                                            )}
                                                        </div>
                                                    ) : editingInvoiceId === t.invoiceId ? (
                                                        <div className="space-y-2">
                                                            <button
                                                                type="button"
                                                                className="w-full rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                                                                onClick={() => updateInvoice.mutate()}
                                                                disabled={updateInvoice.isPending}
                                                            >
                                                                Salvar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="w-full rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700"
                                                                onClick={() => setEditingInvoiceId(null)}
                                                            >
                                                                Cancelar
                                                            </button>
                                                            {updateInvoice.isError && (
                                                                <p className="text-[10px] text-rose-600">{updateInvoice.error.message}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                                t.type === "REVENUE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                            }`}>
                                                                {t.kind === "INVOICE" ? "FATURA" : t.type}
                                                            </span>
                                                            {t.kind !== "INVOICE" && (
                                                                <button
                                                                    type="button"
                                                                    className="block w-full rounded border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50"
                                                                    onClick={() => {
                                                                        setEditingId(t.id);
                                                                        setEditingForm({
                                                                            description: t.description || "",
                                                                            amount: t.amount || "",
                                                                            type: t.type || "EXPENSE",
                                                                            responsibilityTag: t.responsibilityTag || "",
                                                                        });
                                                                }}
                                                            >
                                                                Editar
                                                            </button>
                                                            )}
                                                            {t.kind === "INVOICE" && (
                                                                <button
                                                                    type="button"
                                                                    className="block w-full rounded border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50"
                                                                    onClick={() => {
                                                                        setEditingInvoiceId(t.invoiceId);
                                                                        setEditingInvoiceForm({
                                                                            amount: t.amount || "",
                                                                            creditCardId: t.creditCardId || "",
                                                                            periodId: t.periodId,
                                                                        });
                                                                    }}
                                                                >
                                                                    Editar
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {t.kind === "TRANSACTION" ? (
                                                        <div className="space-y-2">
                                                            {(() => {
                                                                const currentPayment = paymentEdits[t.id] ?? {
                                                                    isClearedByInvoice: t.isClearedByInvoice ?? false,
                                                                    creditCardInvoiceId: t.creditCardInvoiceId ?? "",
                                                                };
                                                                return (
                                                                    <>
                                                            <label className="flex items-center justify-center gap-2 text-xs text-gray-600">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={currentPayment.isClearedByInvoice}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        setPaymentEdits((prev) => ({
                                                                            ...prev,
                                                                            [t.id]: {
                                                                                isClearedByInvoice: checked,
                                                                                creditCardInvoiceId: checked
                                                                                    ? (prev[t.id]?.creditCardInvoiceId ?? t.creditCardInvoiceId ?? invoices[0]?.id ?? "")
                                                                                    : null,
                                                                            },
                                                                        }));
                                                                    }}
                                                                />
                                                                Pago na fatura
                                                            </label>
                                                            <select
                                                                className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                                                                disabled={!currentPayment.isClearedByInvoice}
                                                                value={currentPayment.creditCardInvoiceId ?? ""}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    setPaymentEdits((prev) => ({
                                                                        ...prev,
                                                                        [t.id]: {
                                                                            isClearedByInvoice: prev[t.id]?.isClearedByInvoice ?? t.isClearedByInvoice ?? false,
                                                                            creditCardInvoiceId: value || null,
                                                                        },
                                                                    }));
                                                                }}
                                                            >
                                                                <option value="">Selecione a fatura</option>
                                                                {invoices.map((invoice) => {
                                                                    const cardName = creditCards.find((c) => c.id === invoice.creditCardId)?.name || "Cartao";
                                                                    return (
                                                                        <option key={invoice.id} value={invoice.id}>
                                                                            {cardName} - R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                            <button
                                                                type="button"
                                                                className="w-full rounded bg-indigo-600 px-2 py-1 text-[10px] font-semibold text-white"
                                                                onClick={() =>
                                                                    updatePayment.mutate({
                                                                        id: t.id,
                                                                        isClearedByInvoice: currentPayment.isClearedByInvoice,
                                                                        creditCardInvoiceId: currentPayment.creditCardInvoiceId || null,
                                                                    })
                                                                }
                                                                disabled={updatePayment.isPending}
                                                            >
                                                                Salvar
                                                            </button>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            <h3 className={`mt-1 text-2xl font-bold text-${color}-600`}>
                R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>{icon}</div>
    </div>
);

export default Dashboard;
