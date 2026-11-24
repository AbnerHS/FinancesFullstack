import { useCallback, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import {
  Check,
  Pencil,
  Plus,
  Share2,
  Tags,
  Trash2,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import {
  ConfirmationDialog,
  type ConfirmationDialogState,
} from "@/components/ui/confirmation-dialog.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import {
  useCategoryManager,
  usePlanCollaborationManager,
  useOpenMonthInDashboard,
  usePlanDeleteManager,
  usePlanManager,
} from "@/features/finance/hooks.ts"
import type {
  Plan,
  PlanMonthSummary,
  PlanParticipant,
  TransactionCategory,
} from "@/features/finance/types.ts"
import {
  formatCurrency,
  formatMonthLabel,
} from "@/features/finance/utils.ts"
import { useEscapeKey } from "@/lib/use-escape-key.ts"

export function PlanManager({
  plans,
  activePlan,
  monthSummaries,
  selectedPlanId,
  onSelectPlanId,
  userId,
}: {
  plans: Plan[]
  activePlan: Plan | null
  monthSummaries: PlanMonthSummary[]
  selectedPlanId: string | null
  onSelectPlanId: (id: string | null) => void
  userId: string | null
}) {
  const {
    draft,
    mode,
    setDraft,
    saveMutation,
    startCreate,
    startEdit,
    errorMessage,
  } = usePlanManager({ activePlan, userId, onSelectPlanId })
  const { deletePlanMutation, errorMessage: deletePlanErrorMessage } =
    usePlanDeleteManager({
      activePlan,
      plans,
      onSelectPlanId,
    })
  const isPlanOwner = Boolean(
    activePlan?.ownerId && userId && activePlan.ownerId === userId
  )
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)
  const openMonth = useOpenMonthInDashboard()
  // Mais recentes primeiro.
  const recentMonths = useMemo(
    () => [...monthSummaries].reverse(),
    [monthSummaries]
  )

  return (
    <section className="app-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">Planos Financeiros</p>
          <h2 className="font-serif text-3xl font-semibold text-foreground">
            Estrutura dos seus espaços financeiros
          </h2>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem_24rem]">
        <div className="flex flex-col gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const isActive = plan.id === selectedPlanId
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelectPlanId(plan.id)}
                className={`rounded-[1.5rem] border p-5 text-left transition ${isActive
                  ? "border-primary/20 bg-primary text-primary-foreground shadow-[0_22px_48px_rgba(37,99,235,0.20)]"
                  : "border-border bg-secondary/70 text-foreground hover:border-primary/40"
                  }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {isActive ? (
                    <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] tracking-[0.22em] uppercase">
                      Ativo
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-2 text-sm ${isActive ? "text-white/80" : "text-muted-foreground"}`}
                >
                  {plan.partnerIds.length > 0
                    ? `Compartilhado com ${plan.partnerIds.length} ${plan.partnerIds.length === 1 ? "parceiro" : "parceiros"}`
                    : "Plano individual"}
                </p>
              </button>
            )
          })}
        </div>

        <Card className="border-border bg-secondary/60 p-5">
          <div>
            <p className="app-eyebrow">Meses com lançamentos</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">
              {activePlan ? activePlan.name : "Selecione um plano"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {activePlan
                ? "Todos os meses ficam disponíveis no dashboard; aqui aparecem os que já têm transações."
                : "Escolha um plano para ver o resumo dos meses."}
            </p>
          </div>

          {activePlan ? (
            <div className="mt-5 flex max-h-[26rem] flex-col gap-2 overflow-y-auto">
              {recentMonths.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma transação lançada neste plano ainda.
                </p>
              ) : (
                recentMonths.map((summary) => (
                  <button
                    type="button"
                    key={summary.month}
                    onClick={() => openMonth(summary.month)}
                    title="Abrir este mês no dashboard"
                    className="w-full rounded-[1rem] border border-border bg-card/80 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {formatMonthLabel(Number(summary.month.slice(5, 7)))}/
                          {summary.month.slice(0, 4)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {summary.transactionCount}{" "}
                          {summary.transactionCount === 1
                            ? "lançamento"
                            : "lançamentos"}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold ${summary.balance < 0 ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {formatCurrency(summary.balance)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </Card>

        <Card className="border-border bg-secondary/60 p-5">
          <div className="flex gap-2 rounded-full bg-card/90 p-1">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${mode === "create"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
                }`}
              onClick={startCreate}
            >
              Criar
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium ${mode === "edit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
                }`}
              onClick={startEdit}
              disabled={!activePlan}
            >
              Editar
            </button>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              saveMutation.mutate()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nome do plano</Label>
              <Input
                id="plan-name"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ex.: Casa e rotina"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full"
              disabled={saveMutation.isPending}
            >
              {mode === "create" ? <Plus size={16} /> : null}
              {saveMutation.isPending
                ? "Salvando..."
                : mode === "edit"
                  ? "Salvar nome"
                  : "Criar Plano"}
            </Button>
            <FormError message={errorMessage} />

            {activePlan && isPlanOwner ? (
              <div className="rounded-[1.25rem] border border-rose-200/70 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                <p className="text-sm font-medium text-foreground">
                  Excluir plano
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Remove o plano ativo e todos os dados vinculados que o
                  backend permitir excluir.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/40 dark:text-rose-300"
                  disabled={deletePlanMutation.isPending}
                  onClick={() =>
                    setConfirmationDialog({
                      confirmLabel: "Excluir Plano",
                      description: `O plano "${activePlan.name}" será removido. Esta ação não pode ser desfeita.`,
                      title: "Excluir plano ativo?",
                      onConfirm: () => deletePlanMutation.mutate(),
                    })
                  }
                >
                  <Trash2 size={16} />
                  {deletePlanMutation.isPending
                    ? "Excluindo..."
                    : "Excluir Plano"}
                </Button>
                <div className="mt-3">
                  <FormError message={deletePlanErrorMessage} />
                </div>
              </div>
            ) : null}
          </form>
        </Card>

      </div>
      <ConfirmationDialog
        onClose={() => setConfirmationDialog(null)}
        state={confirmationDialog}
      />
    </section>
  )
}

export function CategoryManager({
  categories,
}: {
  categories: TransactionCategory[]
}) {
  const {
    draft,
    setDraft,
    createMutation,
    editing,
    startEdit,
    setEditingName,
    cancelEdit,
    renameMutation,
    deleteMutation,
    errorMessage,
  } = useCategoryManager()
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)
  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) =>
        left.name.localeCompare(right.name, "pt-BR")
      ),
    [categories]
  )

  return (
    <section className="app-panel">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="app-eyebrow">Categorias</p>
          <h3 className="font-serif text-2xl font-semibold text-foreground">
            Base de classificação
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Renomeie ou exclua categorias criadas por engano. Excluir uma
            categoria deixa as transações dela sem categoria.
          </p>
        </div>
        <div className="rounded-full bg-primary/12 p-3 text-primary">
          <Tags size={18} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedCategories.map((category) =>
                editing?.id === category.id ? (
                  <li key={category.id}>
                    <form
                      className="flex items-center gap-1 rounded-[0.9rem] border border-primary/40 bg-primary/5 p-1"
                      onSubmit={(event) => {
                        event.preventDefault()
                        renameMutation.mutate()
                      }}
                    >
                      <Input
                        autoFocus
                        className="h-9"
                        value={editing.name}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") cancelEdit()
                        }}
                        aria-label={`Novo nome para ${category.name}`}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="size-9 shrink-0"
                        disabled={renameMutation.isPending}
                        aria-label="Salvar nome"
                        title="Salvar"
                      >
                        <Check size={15} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        onClick={cancelEdit}
                        aria-label="Cancelar edição"
                        title="Cancelar"
                      >
                        <X size={15} />
                      </Button>
                    </form>
                  </li>
                ) : (
                  <li
                    key={category.id}
                    className="flex items-center gap-1 rounded-[0.9rem] border border-border bg-secondary/70 py-1 pr-1 pl-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {category.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground"
                      onClick={() => startEdit(category)}
                      aria-label={`Renomear categoria ${category.name}`}
                      title="Renomear"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        setConfirmationDialog({
                          confirmLabel: "Excluir Categoria",
                          title: "Excluir categoria?",
                          description: `A categoria "${category.name}" será removida e as transações dela ficarão sem categoria.`,
                          onConfirm: () => deleteMutation.mutate(category),
                        })
                      }
                      aria-label={`Excluir categoria ${category.name}`}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </li>
                )
              )}
            </ul>
          )}
        </div>

        <Card className="h-fit border-border bg-secondary/60 p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate()
            }}
          >
            <Label htmlFor="new-category">Nova Categoria</Label>
            <Input
              id="new-category"
              className="mt-3"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ex.: Educação"
            />
            <Button
              type="submit"
              className="mt-3 h-11 w-full"
              disabled={createMutation.isPending}
            >
              <Plus size={16} />
              {createMutation.isPending ? "Salvando..." : "Criar Categoria"}
            </Button>
          </form>
        </Card>
        <div className="lg:col-span-2 empty:hidden">
          <FormError message={errorMessage} />
        </div>
      </div>
      <ConfirmationDialog
        onClose={() => setConfirmationDialog(null)}
        state={confirmationDialog}
      />
    </section>
  )
}

export function DashboardPlanQuickCreate({
  activePlan,
  hasPlans,
  onSelectPlanId,
  userId,
}: {
  activePlan: Plan | null
  hasPlans: boolean
  onSelectPlanId: (id: string | null) => void
  userId: string | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { draft, setDraft, saveMutation, errorMessage, startCreate } =
    usePlanManager({ activePlan, userId, onSelectPlanId })

  const openModal = () => {
    startCreate()
    setIsOpen(true)
  }
  const closeModal = useCallback(() => setIsOpen(false), [])
  useEscapeKey(isOpen, closeModal)

  return (
    <>
      <div className="flex items-end">
        {hasPlans ? (
          <Button type="button" variant="outline" className="h-11 w-full md:w-auto" onClick={openModal}>
            <Plus size={16} />
            Novo plano
          </Button>
        ) : (
          <Button type="button" className="h-11 w-full" onClick={openModal}>
            Criar Primeiro Plano
            <Plus size={16} />
          </Button>
        )}
      </div>

      {isOpen
        ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={hasPlans ? "Novo plano" : "Criar primeiro plano"}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-[0_30px_80px_rgba(2,6,23,0.50)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="app-eyebrow">
                    {hasPlans ? "Novo Plano" : "Bem-vindo"}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">
                    {hasPlans
                      ? "Crie outro espaço financeiro"
                      : "Vamos montar seu primeiro plano"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {hasPlans
                      ? "Você pode começar do zero; todos os meses ficam disponíveis no dashboard."
                      : "Comece criando um plano para organizar suas transações, categorias, cartões e períodos."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Fechar
                </Button>
              </div>

              <form
                className="mt-5 space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault()
                  try {
                    await saveMutation.mutateAsync()
                    setIsOpen(false)
                  } catch {
                    // O hook ja expoe a mensagem de erro para o formulario.
                  }
                }}
              >
                <div className="space-y-2">
                  <Label>Nome do plano</Label>
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ex.: Casa 2026"
                  />
                </div>

                <div className="rounded-[1.25rem] border border-border bg-secondary/55 p-4 text-sm text-muted-foreground">
                  Todos os meses ficam disponíveis no dashboard assim que o
                  plano for salvo; é só navegar até o mês e lançar.
                </div>

                {!hasPlans ? (
                  <div className="rounded-[1.25rem] border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                    Dica: seu primeiro plano já nasce com o ano atual completo
                    para liberar o dashboard, os lançamentos e as comparações
                    mensais.
                  </div>
                ) : null}

                <FormError message={errorMessage} />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    <Plus size={16} />
                    {saveMutation.isPending ? "Criando..." : "Criar Plano"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
        : null}
    </>
  )
}

export function PlanParticipantsManager({
  activePlan,
  participants,
  isPlanOwner,
}: {
  activePlan: Plan | null
  participants: PlanParticipant[]
  isPlanOwner: boolean
}) {
  const {
    inviteLink,
    inviteLinkLoading,
    rotateInviteLink,
    revokeInviteLink,
    removeParticipant,
    inviteErrorMessage,
  } = usePlanCollaborationManager({ activePlan, isPlanOwner })
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [confirmationDialog, setConfirmationDialog] =
    useState<ConfirmationDialogState | null>(null)

  if (!activePlan) {
    return null
  }

  const partnerCount = participants.filter(
    (participant) => participant.role === "PARTNER"
  ).length
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  const inviteUrl =
    inviteLink?.active && inviteLink.inviteToken
      ? `${window.location.origin}/invite/${inviteLink.inviteToken}`
      : ""

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Card className="border-border bg-secondary/60 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.28em] text-muted-foreground uppercase">
          <Users size={16} /> Convite por link
        </h3>

        {isPlanOwner ? (
          <>
            <div className="space-y-2">
              <Label>Link ativo</Label>
              <Input
                readOnly
                value={inviteUrl}
                placeholder={
                  inviteLinkLoading ? "Carregando link..." : "Nenhum link ativo"
                }
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={async () => {
                  if (!inviteUrl) {
                    rotateInviteLink.mutate()
                    return
                  }

                  try {
                    await navigator.clipboard.writeText(inviteUrl)
                    setCopyFeedback(
                      "Link copiado para a área de transferência."
                    )
                  } catch {
                    setCopyFeedback("Não foi possível copiar automaticamente.")
                  }
                }}
                disabled={rotateInviteLink.isPending || inviteLinkLoading}
              >
                {inviteUrl
                  ? "Copiar link"
                  : rotateInviteLink.isPending
                    ? "Gerando..."
                    : "Gerar link"}
              </Button>

              {inviteUrl && canShare ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: "Convite para o plano",
                        text: activePlan
                          ? `Entre no plano "${activePlan.name}" no Finances:`
                          : "Entre no meu plano no Finances:",
                        url: inviteUrl,
                      })
                    } catch (error) {
                      // Fechar a folha de compartilhamento não é erro.
                      if (!(error instanceof DOMException && error.name === "AbortError")) {
                        setCopyFeedback("Não foi possível compartilhar o link.")
                      }
                    }
                  }}
                >
                  <Share2 size={16} />
                  Compartilhar
                </Button>
              ) : null}

              <Button
                type="button"
                variant="outline"
                onClick={() => rotateInviteLink.mutate()}
                disabled={rotateInviteLink.isPending || !activePlan}
              >
                {rotateInviteLink.isPending
                  ? "Rotacionando..."
                  : inviteUrl
                    ? "Rotacionar link"
                    : "Gerar novo link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => revokeInviteLink.mutate()}
                disabled={revokeInviteLink.isPending || !inviteUrl}
              >
                {revokeInviteLink.isPending ? "Revogando..." : "Revogar link"}
              </Button>
            </div>

            {copyFeedback ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {copyFeedback}
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-[1.25rem] border border-border bg-card/80 p-4 text-sm text-muted-foreground">
            Somente o owner do plano pode gerar, rotacionar ou revogar links de
            convite.
          </div>
        )}

        <div className="mt-3">
          <FormError message={inviteErrorMessage} />
        </div>
      </Card>

      <Card className="border-border bg-secondary/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Participantes atuais
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {partnerCount === 0
                ? "Este plano ainda não possui parceiros adicionais."
                : `${partnerCount} ${partnerCount === 1 ? "parceiro ativo" : "parceiros ativos"}`}
            </p>
          </div>
          <div className="rounded-full bg-accent px-3 py-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {participants.length} pessoas
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className="rounded-[1.25rem] border border-border bg-card/90 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {participant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participant.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                    {participant.role === "OWNER" ? "Owner" : "Partner"}
                  </span>

                  {isPlanOwner && participant.role === "PARTNER" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setConfirmationDialog({
                          confirmLabel: "Remover Parceiro",
                          description: `${participant.name} deixará de participar deste plano.`,
                          title: `Remover ${participant.name}?`,
                          onConfirm: () =>
                            removeParticipant.mutate(participant.userId),
                        })
                      }
                      disabled={removeParticipant.isPending}
                    >
                      {removeParticipant.isPending ? "Removendo..." : "Remover"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <ConfirmationDialog
        onClose={() => setConfirmationDialog(null)}
        state={confirmationDialog}
      />
    </div>
  )
}
