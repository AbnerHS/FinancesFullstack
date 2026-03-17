import { KeyRound, UserRound } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button.tsx"
import { FormError } from "@/components/ui/form-error.tsx"
import { Input } from "@/components/ui/input.tsx"
import { Label } from "@/components/ui/label.tsx"
import { useProfileSettings } from "@/features/finance/hooks.ts"

export function ProfilePage() {
  const { user, profileMutation, passwordMutation, profileError, passwordError } =
    useProfileSettings()
  const [profileForm, setProfileForm] = useState<{ name: string; email: string } | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  })
  const resolvedProfileForm = profileForm ?? {
    name: user?.name || "",
    email: user?.email || "",
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="app-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-eyebrow">Perfil</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">
              Dados básicos da conta
            </h2>
          </div>
          <div className="rounded-full bg-accent p-3 text-primary">
            <UserRound size={18} />
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            profileMutation.mutate(resolvedProfileForm, {
              onSuccess: () => setProfileForm(null),
            })
          }}
        >
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={resolvedProfileForm.name}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...(current ?? resolvedProfileForm),
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={resolvedProfileForm.email}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...(current ?? resolvedProfileForm),
                  email: event.target.value,
                }))
              }
            />
          </div>
          <Button type="submit" className="h-11" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? "Salvando..." : "Atualizar perfil"}
          </Button>
          {profileMutation.isSuccess ? (
            <p className="text-sm text-emerald-500 dark:text-emerald-400">Perfil atualizado com sucesso.</p>
          ) : null}
          <FormError message={profileError} />
        </form>
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-eyebrow">Segurança</p>
            <h2 className="font-serif text-3xl font-semibold text-foreground">
              Alterar senha
            </h2>
          </div>
          <div className="rounded-full bg-accent p-3 text-primary">
            <KeyRound size={18} />
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            passwordMutation.mutate(passwordForm, {
              onSuccess: () =>
                setPasswordForm({
                  currentPassword: "",
                  newPassword: "",
                }),
            })
          }}
        >
          <div className="space-y-2">
            <Label>Senha atual</Label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
            />
          </div>
          <Button type="submit" className="h-11" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? "Atualizando..." : "Atualizar senha"}
          </Button>
          {passwordMutation.isSuccess ? (
            <p className="text-sm text-emerald-500 dark:text-emerald-400">Senha atualizada com sucesso.</p>
          ) : null}
          <FormError message={passwordError} />
        </form>
      </section>
    </div>
  )
}
