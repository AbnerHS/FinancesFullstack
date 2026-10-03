import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import {
  AppShellSidebar,
  MobileSidebarButton,
} from "@/components/app-shell-sidebar.tsx"
import { authService } from "@/features/auth/auth-service.ts"
import { useAuthStore } from "@/stores/auth-store.ts"
import { useDashboardStore } from "@/features/finance/dashboard-store"

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard Financeiro",
    description:
      "Acompanhe o plano, compare períodos e mantenha a operação central em uma visão só.",
  },
  "/profile": {
    title: "Meu Perfil",
    description: "Atualize dados básicos da conta e mantenha o acesso seguro.",
  },
  "/plans": {
    title: "Planos Financeiros",
    description: "Organize os planos e escolha o contexto ativo do produto.",
  },
  "/cards": {
    title: "Cartões e Faturas",
    description:
      "Centralize cartões, faturas e recorte das despesas ligadas ao crédito.",
  },
  "/partner": {
    title: "Participantes do Plano",
    description:
      "Gerencie parceiros, convites por link e a composição do plano compartilhado.",
  },
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const clearSelections = useDashboardStore((state) => state.clearSelections)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const meta = useMemo(
    () => routeMeta[location.pathname] ?? routeMeta["/"],
    [location.pathname]
  )

  return (
    <div className="min-h-svh text-foreground">
      <AppShellSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={async () => {
          // Apaga o cookie de refresh no servidor; se falhar, sai localmente mesmo assim.
          await authService.logout().catch(() => undefined)
          clearTokens()
          clearSelections()
          await navigate({ to: "/login" })
        }}
        userName={user?.name}
        userEmail={user?.email}
      />

      <div className="lg:pl-[19rem]">
        {/* No mobile, fundo quase opaco em vez de blur: o desfoque do cabeçalho fixo era refeito a cada quadro de rolagem. */}
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background lg:bg-background/78 lg:backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-2.5 sm:px-6 sm:py-4 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <MobileSidebarButton onClick={() => setSidebarOpen(true)} />
              <div className="min-w-0 space-y-1">
                <h1 className="truncate font-serif text-xl font-semibold text-foreground sm:text-2xl">
                  {meta.title}
                </h1>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
                {user?.name || "Usuário"}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
