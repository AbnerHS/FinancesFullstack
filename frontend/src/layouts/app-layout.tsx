import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { AppShellSidebar, MobileSidebarButton } from "@/components/app-shell-sidebar.tsx"
import { ThemeToggle } from "@/components/theme-toggle.tsx"
import { useAuthStore } from "@/stores/auth-store.ts"

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard Financeiro",
    description: "Acompanhe o plano, compare periodos e mantenha a operacao central em uma visao so.",
  },
  "/profile": {
    title: "Meu Perfil",
    description: "Atualize dados basicos da conta e mantenha o acesso seguro.",
  },
  "/plans": {
    title: "Planos Financeiros",
    description: "Organize os planos e escolha o contexto ativo do produto.",
  },
  "/periods": {
    title: "Periodos",
    description: "Crie periodos, compare meses e prepare o fluxo financeiro de cada janela.",
  },
  "/cards": {
    title: "Cartoes e Faturas",
    description: "Centralize cartoes, faturas e recorte das despesas ligadas ao credito.",
  },
  "/partner": {
    title: "Parceiro do Plano",
    description: "Defina o parceiro e mantenha a atribuicao de responsabilidades consistente.",
  },
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const clearTokens = useAuthStore((state) => state.clearTokens)
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
                {user?.name || "Usuario"}
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
