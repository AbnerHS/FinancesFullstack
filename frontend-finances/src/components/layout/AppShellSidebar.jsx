import {
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Menu,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    description: "Resumo, graficos e fluxo diario",
    icon: LayoutDashboard,
  },
  {
    to: "/profile",
    label: "Meu Perfil",
    description: "Dados basicos e senha",
    icon: UserRound,
  },
  {
    to: "/plans",
    label: "Planos Financeiros",
    description: "Estrutura e nome dos planos",
    icon: FolderKanban,
  },
  {
    to: "/periods",
    label: "Periodos",
    description: "Comparacao e criacao mensal",
    icon: WalletCards,
  },
  {
    to: "/cards",
    label: "Cartoes",
    description: "Cartoes e faturas",
    icon: CreditCard,
  },
  {
    to: "/partner",
    label: "Parceiro do Plano",
    description: "Compartilhamento e responsaveis",
    icon: Users,
  },
];

export const AppShellSidebar = ({
  isOpen,
  onClose,
  onLogout,
  user,
}) => (
  <>
    <button
      type="button"
      onClick={onClose}
      className={`fixed inset-0 z-30 bg-slate-950/35 transition lg:hidden ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-label="Fechar menu"
    />

    <aside
      className={`app-sidebar fixed inset-y-0 left-0 z-40 w-[19rem] transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/dashboard" className="space-y-1" onClick={onClose}>
            <div className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
              Finances
            </div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Editorial Finance Hub
            </p>
          </Link>

          <button
            type="button"
            className="rounded-full border border-[var(--color-line)] p-2 text-[var(--color-ink)] lg:hidden"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mx-4 rounded-[1.75rem] border border-[var(--color-line)] bg-[var(--color-panel)]/85 p-4 shadow-[0_18px_50px_rgba(17,60,58,0.08)] backdrop-blur">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
            Usuario ativo
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-lg font-semibold text-[var(--color-accent-strong)]">
              {user?.name?.slice(0, 1) || "F"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--color-ink-strong)]">
                {user?.name || "Sua conta"}
              </p>
              <p className="truncate text-xs text-[var(--color-muted)]">
                {user?.email || "Sem email"}
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 transition ${
                    isActive
                      ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-strong)] text-white shadow-[0_18px_40px_rgba(17,60,58,0.22)]"
                      : "border-transparent bg-transparent text-[var(--color-ink)] hover:border-[var(--color-line)] hover:bg-[var(--color-panel)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`mt-0.5 rounded-2xl p-2 ${
                        isActive
                          ? "bg-white/12 text-white"
                          : "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div
                        className={`text-xs ${
                          isActive ? "text-white/75" : "text-[var(--color-muted)]"
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-line)] px-4 py-4">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)]"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </aside>
  </>
);

export const MobileSidebarButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-3 text-[var(--color-ink)] shadow-sm lg:hidden"
    aria-label="Abrir menu"
  >
    <Menu size={18} />
  </button>
);
