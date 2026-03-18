import { useEffect, useRef } from "react"

import { Card } from "@/components/ui/card.tsx"
import { AuthShell } from "@/features/auth/auth-shell.tsx"
import { useGoogleLogin } from "@/features/auth/use-auth-mutations.ts"

const redirectToLoginWithError = () => {
  window.location.replace("/login?authError=google")
}

export function GoogleAuthCallback() {
  const googleLogin = useGoogleLogin()
  const hasAttemptedLogin = useRef(false)

  useEffect(() => {
    if (hasAttemptedLogin.current) {
      return
    }

    hasAttemptedLogin.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    const providerError = params.get("error")

    if (providerError || !code) {
      redirectToLoginWithError()
      return
    }

    void googleLogin.mutateAsync({ code }).catch(() => {
      redirectToLoginWithError()
    })
  }, [googleLogin])

  return (
    <AuthShell
      title="Entrando com Google"
      description="Estamos validando sua autenticacao e preparando seu workspace."
      footer="Se algo der errado, voce sera redirecionado para a tela de login."
    >
      <Card className="space-y-3 p-6 text-sm text-muted-foreground">
        <p>Concluindo seu acesso com Google...</p>
        <p>Esta etapa envia o codigo de autorizacao ao backend e salva sua sessao local.</p>
      </Card>
    </AuthShell>
  )
}
