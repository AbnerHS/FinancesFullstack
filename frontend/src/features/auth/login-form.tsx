import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { AuthShell } from "@/features/auth/auth-shell.tsx"
import type { LoginInput } from "@/features/auth/types.ts"
import { useLogin } from "@/features/auth/use-auth-mutations.ts"
import { getErrorMessage } from "@/lib/errors.ts"

export function LoginForm() {
  const login = useLogin()
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

  return (
    <AuthShell
      title="Entrar"
      description="Acesse seu workspace financeiro para acompanhar planos, períodos e transações."
      footer={
        <span>
          Ainda não tem conta?{" "}
          <Link to="/sign-up" className="font-semibold text-primary">
            Criar agora
          </Link>
        </span>
      }
    >
      <Card className="p-6">
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
              login.error
                ? getErrorMessage(login.error, "Não foi possível entrar na conta.")
                : null
            }
          />

          <Button className="h-11 w-full text-sm" disabled={isSubmitting || login.isPending} type="submit">
            {isSubmitting || login.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  )
}
