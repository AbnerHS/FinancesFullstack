import { Link, useLocation } from "@tanstack/react-router"
import { CreditCard, LayoutDashboard, LineChart, Plus, ShoppingCart } from "lucide-react"

import { cn } from "@/lib/utils.ts"

const tabs = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/evolucao", label: "Evolução", icon: LineChart },
  { to: "/cards", label: "Cartões", icon: CreditCard },
  { to: "/compras", label: "Compras", icon: ShoppingCart },
] as const

/**
 * Barra fixa do celular: as telas do dia a dia e o "+" de nova transação ao alcance do polegar. O
 * restante (planos, perfil, participantes) fica no menu ☰ do topo.
 */
export function MobileBottomNav({ onNewTransaction }: { onNewTransaction: () => void }) {
  const { pathname } = useLocation()
  const [dashboard, evolution, cards, shopping] = tabs

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_rgba(15,23,42,0.12)] lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        <NavTab {...dashboard} active={pathname === dashboard.to} />
        <NavTab {...evolution} active={pathname === evolution.to} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onNewTransaction}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(37,99,235,0.35)] transition active:scale-95"
            aria-label="Nova transação"
          >
            <Plus size={22} />
          </button>
        </div>
        <NavTab {...cards} active={pathname === cards.to} />
        <NavTab {...shopping} active={pathname === shopping.to} />
      </div>
    </nav>
  )
}

function NavTab({
  to,
  label,
  icon: Icon,
  active,
}: (typeof tabs)[number] & { active: boolean }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon size={20} />
      {label}
    </Link>
  )
}
