import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { AppShellSidebar, MobileSidebarButton } from "@/components/app-shell-sidebar.tsx"
import { useAuthStore } from "@/stores/auth-store.ts"

const routeMeta: Record<string, { title: string; description: string }> = {
  "/dashboard": {
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const meta = useMemo(
    () => routeMeta[location.pathname] ?? routeMeta["/dashboard"],
    [location.pathname]
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(28,90,113,0.12),transparent_24%),linear-gradient(180deg,#edf5f8_0%,#dde8ee_42%,#d3e1e8_100%)] text-slate-700">
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
        <header className="sticky top-0 z-20 border-b border-border/80 bg-[rgba(207,223,231,0.92)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-start gap-3">
              <MobileSidebarButton onClick={() => setSidebarOpen(true)} />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
                  Workspace Financeiro
                </p>
                <h1 className="font-serif text-2xl font-semibold text-slate-900">{meta.title}</h1>
                <p className="max-w-3xl text-sm text-slate-600">{meta.description}</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-border bg-white/80 px-4 py-2 text-sm text-slate-600 shadow-sm md:flex">
              {user?.name || "Usuário"}
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
