import { Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  AppShellSidebar,
  MobileSidebarButton,
} from "@/components/app-shell-sidebar.tsx"
import { HeaderPlanSelect } from "@/components/header-plan-select.tsx"
import { MobileBottomNav } from "@/components/mobile-bottom-nav.tsx"
import { authService } from "@/features/auth/auth-service.ts"
import { useAuthStore } from "@/stores/auth-store.ts"
import { useDashboardStore } from "@/features/finance/dashboard-store"

const routeMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard Financeiro",
    description:
      "Acompanhe o plano, compare períodos e mantenha a operação central em uma visão só.",
  },
  "/evolucao": {
    title: "Evolução",
    description: "Compare meses: receitas, despesas, categorias e responsáveis.",
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
  "/compras": {
    title: "Compras",
    description: "Os produtos de sempre: desmarque o que falta e marque no mercado.",
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
  const requestComposer = useDashboardStore((state) => state.requestComposer)

  // Nova transação de qualquer tela: vai para o dashboard e o mês ativo abre o formulário.
  const openNewTransaction = useCallback(() => {
    requestComposer()
    if (location.pathname !== "/") {
      void navigate({ to: "/" })
    }
  }, [location.pathname, navigate, requestComposer])

  // Atalho N (fora de campos de texto e sem modal aberto).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "n" || event.repeat) return
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [role='combobox']"))
      ) {
        return
      }
      if (document.querySelector("[aria-modal='true']")) return
      event.preventDefault()
      openNewTransaction()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openNewTransaction])

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

      {/* overflow-x-clip: o swipe de mês desliza o conteúdo até a borda da tela sem criar rolagem
          lateral (clip, não hidden, para não quebrar os elementos sticky). */}
      <div className="overflow-x-clip lg:pl-[19rem]">
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
            <HeaderPlanSelect />
          </div>
        </header>

        {/* No celular, espaço para a barra inferior fixa. */}
        <main className="mx-auto max-w-[110rem] px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav onNewTransaction={openNewTransaction} />
    </div>
  )
}
