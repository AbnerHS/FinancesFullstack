import { useState } from "react";
import { KeyRound, UserRound } from "lucide-react";

import { useProfileSettings } from "../hooks/useProfileSettings";

const Profile = () => {
  const { user, profileMutation, passwordMutation, profileError, passwordError } =
    useProfileSettings();
  const [profileForm, setProfileForm] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const resolvedProfileForm = profileForm ?? {
    name: user?.name || "",
    email: user?.email || "",
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="app-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-eyebrow">Perfil</p>
            <h2 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
              Dados basicos da conta
            </h2>
          </div>
          <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
            <UserRound size={18} />
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            profileMutation.mutate(resolvedProfileForm, {
              onSuccess: () => setProfileForm(null),
            });
          }}
        >
          <div>
            <label className="app-label">Nome</label>
            <input
              className="mt-2 app-input"
              value={resolvedProfileForm.name}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...(current ?? resolvedProfileForm),
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="app-label">Email</label>
            <input
              className="mt-2 app-input"
              value={resolvedProfileForm.email}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...(current ?? resolvedProfileForm),
                  email: event.target.value,
                }))
              }
            />
          </div>
          <button type="submit" className="app-button-primary" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? "Salvando..." : "Atualizar perfil"}
          </button>
          {profileMutation.isSuccess && (
            <p className="text-sm text-[var(--color-success)]">Perfil atualizado com sucesso.</p>
          )}
          {profileError && <p className="text-sm text-[var(--color-danger)]">{profileError}</p>}
        </form>
      </section>

      <section className="app-panel">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="app-eyebrow">Seguranca</p>
            <h2 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
              Alterar senha
            </h2>
          </div>
          <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
            <KeyRound size={18} />
          </div>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            passwordMutation.mutate(passwordForm, {
              onSuccess: () =>
                setPasswordForm({
                  currentPassword: "",
                  newPassword: "",
                }),
            });
          }}
        >
          <div>
            <label className="app-label">Senha atual</label>
            <input
              type="password"
              className="mt-2 app-input"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="app-label">Nova senha</label>
            <input
              type="password"
              className="mt-2 app-input"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
            />
          </div>
          <button type="submit" className="app-button-primary" disabled={passwordMutation.isPending}>
            {passwordMutation.isPending ? "Atualizando..." : "Atualizar senha"}
          </button>
          {passwordMutation.isSuccess && (
            <p className="text-sm text-[var(--color-success)]">Senha atualizada com sucesso.</p>
          )}
          {passwordError && <p className="text-sm text-[var(--color-danger)]">{passwordError}</p>}
        </form>
      </section>
    </div>
  );
};

export default Profile;
