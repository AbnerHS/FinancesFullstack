import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useState } from "react"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { AuthShell } from "@/features/auth/auth-shell.tsx"
import type { LoginInput } from "@/features/auth/types.ts"
import { useLogin } from "@/features/auth/use-auth-mutations.ts"
import { getErrorMessage } from "@/lib/errors.ts"
import { googleAuthorizationUrl } from "@/lib/env.ts"

export function LoginForm() {
  const login = useLogin()
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const authError = new URLSearchParams(window.location.search).get("authError")
  const callbackErrorMessage =
    authError === "google"
      ? "Não foi possível concluir o login com Google. Tente novamente."
      : null

  return (
    <AuthShell
      title="Entrar"
      description="Acesse seu workspace financeiro para acompanhar planos, períodos e transações."
      footer={
        <span>
          Ainda não tem conta?{" "}
          <Link to="/sign-up" className="font-semibold text-primary">
            Criar Conta
          </Link>
        </span>
      }
    >
      <Card className="p-6">
        <div className="space-y-5">
          <Button
            className="h-11 w-full gap-3 text-sm"
            disabled={isSubmitting || login.isPending || isRedirectingToGoogle}
            type="button"
            variant="outline"
            onClick={() => {
              setIsRedirectingToGoogle(true)
              window.location.assign(googleAuthorizationUrl)
            }}
          >
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[0.7rem] font-semibold"
            >
              G
            </span>
            {isRedirectingToGoogle ? "Redirecionando..." : "Continuar com Google"}
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>ou continue com email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form
            className="space-y-5"
            onSubmit={handleSubmit(async (data) => {
              await login.mutateAsync(data)
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email", { required: "O email é obrigatório." })}
              />
              <FormError message={errors.email?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password", { required: "A senha é obrigatória." })}
              />
              <FormError message={errors.password?.message} />
            </div>

            <FormError
              message={
                callbackErrorMessage ??
                (login.error
                  ? getErrorMessage(login.error, "Não foi possível entrar na conta.")
                  : null)
              }
            />

            <Button className="h-11 w-full text-sm" disabled={isSubmitting || login.isPending} type="submit">
              {isSubmitting || login.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </Card>
    </AuthShell>
  )
}
