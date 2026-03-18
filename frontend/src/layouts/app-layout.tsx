import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { AppShellSidebar, MobileSidebarButton } from "@/components/app-shell-sidebar.tsx"
import { ThemeToggle } from "@/components/theme-toggle.tsx"
import { useAuthStore } from "@/stores/auth-store.ts"
import { useDashboardStore } from "@/features/finance/dashboard-store"

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard Financeiro",
    description: "Acompanhe o plano, compare períodos e mantenha a operação central em uma visão só.",
  },
  "/profile": {
    title: "Meu Perfil",
    description: "Atualize dados básicos da conta e mantenha o acesso seguro.",
  },
  "/plans": {
    title: "Planos Financeiros",
    description: "Organize os planos e escolha o contexto ativo do produto.",
  },
  "/periods": {
    title: "Períodos",
    description: "Crie períodos, compare meses e prepare o fluxo financeiro de cada janela.",
  },
  "/cards": {
    title: "Cartões e Faturas",
    description: "Centralize cartões, faturas e recorte das despesas ligadas ao crédito.",
  },
  "/partner": {
    title: "Parceiro do Plano",
    description: "Defina o parceiro e mantenha a atribuição de responsabilidades consistente.",
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
    <div className="min-h-screen text-foreground">
      <AppShellSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={async () => {
          clearTokens()
          clearSelections()
          await navigate({ to: "/login" })
        }}
        userName={user?.name}
        userEmail={user?.email}
      />

      <div className="lg:pl-[19rem]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/78 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-start gap-3">
              <MobileSidebarButton onClick={() => setSidebarOpen(true)} />
              <div className="space-y-1">
                <h1 className="font-serif text-2xl font-semibold text-foreground">{meta.title}</h1>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <ThemeToggle />
              <div className="rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-xl">
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
