import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { financeKeys, planService } from "@/features/finance/services.ts"
import { setPostAuthRedirect } from "@/features/auth/post-auth-redirect.ts"
import { getErrorMessage } from "@/lib/errors.ts"
import { useAuthStore } from "@/stores/auth-store.ts"

function readInviteToken() {
  const segments = window.location.pathname.split("/").filter(Boolean)
  return segments.at(-1) ?? ""
}

export function InvitePage() {
  const token = readInviteToken()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const setSelectedPlanId = useDashboardStore((state) => state.setSelectedPlanId)

  useEffect(() => {
    if (!token || accessToken) {
      return
    }

    setPostAuthRedirect(`${window.location.pathname}${window.location.search}`)
    window.location.replace("/login")
  }, [accessToken, token])

  const invitationQuery = useQuery({
    queryKey: financeKeys.invitation(token),
    queryFn: () => planService.resolveInvitation(token),
    enabled: Boolean(accessToken && token),
    retry: false,
  })

  const acceptInvitation = useMutation({
    mutationFn: () => planService.acceptInvitation(token),
    onSuccess: async (response) => {
      setSelectedPlanId(response.planId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.plans }),
        queryClient.invalidateQueries({ queryKey: financeKeys.invitation(token) }),
        queryClient.invalidateQueries({ queryKey: financeKeys.participants(response.planId) }),
      ])
      await navigate({ to: "/partner" })
    },
  })

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
        <Card className="w-full border-border bg-card/90 p-6 text-center">
          <h2 className="font-serif text-2xl font-semibold text-foreground">Convite inválido</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            O link informado não parece válido.
          </p>
        </Card>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
        <Card className="w-full border-border bg-card/90 p-6 text-center">
          <h2 className="font-serif text-2xl font-semibold text-foreground">Redirecionando...</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Estamos levando você para o login para concluir o convite.
          </p>
        </Card>
      </div>
    )
  }

  const invitation = invitationQuery.data
  const queryError = invitationQuery.error
    ? getErrorMessage(invitationQuery.error, "Não foi possível carregar o convite.")
    : null
  const acceptError = acceptInvitation.error
    ? getErrorMessage(acceptInvitation.error, "Não foi possível aceitar o convite.")
    : null

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
      <Card className="w-full border-border bg-card/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <p className="app-eyebrow">Convite do Plano</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold text-foreground">
          {invitation?.planName || "Entrar em um plano compartilhado"}
        </h2>

        {invitationQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Carregando detalhes do convite...</p>
        ) : null}

        {invitation ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Owner: <span className="font-semibold text-foreground">{invitation.ownerName}</span>
              {" · "}
              {invitation.ownerEmail}
            </p>

            <div className="mt-6 rounded-[1.25rem] border border-border bg-secondary/55 p-4">
              {invitation.owner ? (
                <p className="text-sm text-foreground">
                  Este link pertence a um plano do qual você já é owner.
                </p>
              ) : invitation.alreadyParticipant ? (
                <p className="text-sm text-foreground">
                  Você já participa deste plano. Se quiser, pode ir direto para a área de participantes.
                </p>
              ) : (
                <p className="text-sm text-foreground">
                  Ao aceitar, este plano será adicionado ao seu workspace e ficará disponível no dashboard,
                  nos períodos e nas transações.
                </p>
              )}
            </div>
          </>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {invitation && !invitation.owner && !invitation.alreadyParticipant ? (
            <Button
              type="button"
              onClick={() => acceptInvitation.mutate()}
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending ? "Entrando..." : "Aceitar convite"}
            </Button>
          ) : null}

          {invitation ? (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setSelectedPlanId(invitation.planId)
                await navigate({ to: "/partner" })
              }}
            >
              Ir para participantes
            </Button>
          ) : null}

          <Button type="button" variant="ghost" onClick={() => window.location.replace("/")}>
            Voltar ao app
          </Button>
        </div>

        <div className="mt-4">
          <FormError message={queryError || acceptError} />
        </div>
      </Card>
    </div>
  )
}
