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
  { to: "/", label: "Dashboard", description: "Resumo e fluxo diario", icon: LayoutDashboard },
  { to: "/profile", label: "Perfil", description: "Conta e senha", icon: UserRound },
  { to: "/plans", label: "Planos", description: "Estrutura financeira", icon: FolderKanban },
  { to: "/periods", label: "Periodos", description: "Comparacao mensal", icon: WalletCards },
  { to: "/cards", label: "Cartoes", description: "Cartoes e faturas", icon: CreditCard },
  { to: "/partner", label: "Parceiro", description: "Participantes do plano", icon: Users },
]

export function MobileSidebarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-border bg-card/80 p-3 text-foreground shadow-sm backdrop-blur-xl lg:hidden"
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
          "fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm transition lg:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-label="Fechar menu"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[19rem] border-r border-sidebar-border bg-[linear-gradient(180deg,rgba(248,251,255,0.88),rgba(226,235,255,0.82))] shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-transform duration-300 dark:bg-[linear-gradient(180deg,rgba(11,22,40,0.96),rgba(19,34,56,0.94))] dark:shadow-[0_28px_90px_rgba(2,6,23,0.54)] lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-5">
            <Link to="/" className="space-y-1" onClick={onClose}>
              <div className="font-serif text-2xl font-semibold text-foreground">Finances</div>
            </Link>
            <button
              type="button"
              className="rounded-full border border-border bg-card/50 p-2 text-foreground lg:hidden"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mx-4 rounded-[1.75rem] border border-border bg-card/75 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Usuario ativo</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary">
                {userName?.slice(0, 1) || "F"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{userName || "Sua conta"}</p>
                <p className="truncate text-xs text-muted-foreground">{userEmail || "Sem email"}</p>
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
                      "border-primary/20 bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(37,99,235,0.24)] dark:text-primary-foreground",
                  }}
                  inactiveProps={{
                    className:
                      "border-transparent bg-transparent text-foreground hover:border-border hover:bg-card/70",
                  }}
                  className="group flex items-start gap-3 rounded-[1.5rem] border px-4 py-3 transition [&[aria-current=page]_.nav-description]:text-primary-foreground/80 [&[aria-current=page]_.nav-icon]:bg-primary-foreground/16 [&[aria-current=page]_.nav-icon]:text-primary-foreground"
                >
                  <div className="nav-icon mt-0.5 rounded-2xl bg-primary/12 p-2 text-primary">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="nav-description text-xs text-muted-foreground">
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
              className="h-12 w-full justify-start gap-2 rounded-[1.25rem] bg-card/70 text-foreground"
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
