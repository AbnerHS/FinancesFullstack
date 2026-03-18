import { Plus } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button.tsx"
import { Card } from "@/components/ui/card.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { AuthShell } from "@/features/auth/auth-shell.tsx"
import type { SignUpInput } from "@/features/auth/types.ts"
import { useRegister } from "@/features/auth/use-auth-mutations.ts"
import { getErrorMessage } from "@/lib/errors.ts"

export function SignUpForm() {
  const registerUser = useRegister()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  return (
    <AuthShell
      title="Criar Conta"
      description="Abra sua conta para começar a organizar planos, períodos e responsabilidades financeiras."
      footer={
        <span>
          Já tem conta?{" "}
          <Link to="/login" className="font-semibold text-primary">
            Fazer login
          </Link>
        </span>
      }
    >
      <Card className="p-6">
        <form
          className="space-y-5"
          onSubmit={handleSubmit(async (data) => {
            await registerUser.mutateAsync(data)
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              autoComplete="name"
              {...register("name", { required: "O nome é obrigatório." })}
            />
            <FormError message={errors.name?.message} />
          </div>

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
              autoComplete="new-password"
              {...register("password", {
                required: "A senha é obrigatória.",
                minLength: {
                  value: 6,
                  message: "Use pelo menos 6 caracteres.",
                },
              })}
            />
            <FormError message={errors.password?.message} />
          </div>

          <FormError
            message={
              registerUser.error
                ? getErrorMessage(registerUser.error, "Não foi possível criar a conta.")
                : null
            }
          />

          <Button
            className="h-11 w-full text-sm"
            disabled={isSubmitting || registerUser.isPending}
            type="submit"
          >
            <Plus size={16} />
            {isSubmitting || registerUser.isPending ? "Criando..." : "Criar Conta"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  )
}
