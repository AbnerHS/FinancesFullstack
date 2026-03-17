import { Link } from "@tanstack/react-router"
import {
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { cn } from "@/lib/utils.ts"

type AppShellSidebarProps = {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  userName?: string
  userEmail?: string
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", description: "Resumo e fluxo diário", icon: LayoutDashboard },
  { to: "/profile", label: "Perfil", description: "Conta e senha", icon: UserRound },
  { to: "/plans", label: "Planos", description: "Estrutura financeira", icon: FolderKanban },
  { to: "/periods", label: "Períodos", description: "Comparação mensal", icon: WalletCards },
  { to: "/cards", label: "Cartões", description: "Cartões e faturas", icon: CreditCard },
  { to: "/partner", label: "Parceiro", description: "Participantes do plano", icon: Users },
]

export function MobileSidebarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-border bg-card p-3 text-foreground shadow-sm lg:hidden"
      aria-label="Abrir menu"
    >
      <Menu size={18} />
    </button>
  )
}

export function AppShellSidebar({
  isOpen,
  onClose,
  onLogout,
  userName,
  userEmail,
}: AppShellSidebarProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-slate-950/35 transition lg:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-label="Fechar menu"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[19rem] border-r border-border bg-[linear-gradient(180deg,rgba(248,252,254,0.98),rgba(212,227,234,0.96))] shadow-[0_24px_60px_rgba(13,50,65,0.12)] transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5">
            <Link to="/dashboard" className="space-y-1" onClick={onClose}>
              <div className="font-serif text-2xl font-semibold text-slate-900">Finances</div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                Editorial Finance Hub
              </p>
            </Link>
            <button
              type="button"
              className="rounded-full border border-border p-2 text-foreground lg:hidden"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mx-4 rounded-[1.75rem] border border-border bg-white/85 p-4 shadow-[0_18px_50px_rgba(17,60,58,0.08)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Usuário ativo</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg font-semibold text-sky-900">
                {userName?.slice(0, 1) || "F"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{userName || "Sua conta"}</p>
                <p className="truncate text-xs text-slate-500">{userEmail || "Sem email"}</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  activeProps={{
                    className:
                      "border-sky-900 bg-sky-950 text-white shadow-[0_18px_40px_rgba(17,60,58,0.22)]",
                  }}
                  inactiveProps={{
                    className:
                      "border-transparent bg-transparent text-slate-700 hover:border-border hover:bg-white/80",
                  }}
                  className="group flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 transition"
                >
                  <div className="mt-0.5 rounded-2xl bg-sky-100 p-2 text-sky-900 group-[.active]:bg-white/12 group-[.active]:text-white">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-slate-500 group-[.active]:text-white/75">
                      {item.description}
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border px-4 py-4">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-2 rounded-[1.25rem] bg-white text-slate-700"
              onClick={onLogout}
            >
              <LogOut size={16} />
              Sair da conta
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
