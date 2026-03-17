import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { AppShellSidebar, MobileSidebarButton } from "../components/layout/AppShellSidebar";
import { useAuthStore } from "../store/authStore";

const routeMeta = {
  "/dashboard": {
    title: "Dashboard Financeiro",
    description: "Acompanhe o plano, compare periodos e entre em modo de edicao sem sair da visao geral.",
  },
  "/profile": {
    title: "Meu Perfil",
    description: "Atualize dados basicos da conta e mantenha o acesso seguro.",
  },
  "/plans": {
    title: "Planos Financeiros",
    description: "Organize a estrutura dos seus planos e escolha o contexto ativo do produto.",
  },
  "/periods": {
    title: "Periodos",
    description: "Crie periodos, compare meses e prepare o fluxo financeiro para cada janela.",
  },
  "/cards": {
    title: "Cartoes e Faturas",
    description: "Centralize cartoes, faturas e o recorte das despesas ligadas ao credito.",
  },
  "/partner": {
    title: "Parceiro do Plano",
    description: "Defina o parceiro e mantenha a atribuicao de responsabilidades consistente.",
  },
};

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const meta = useMemo(
    () => routeMeta[location.pathname] ?? routeMeta["/dashboard"],
    [location.pathname]
  );

  const onLogout = () => {
    useAuthStore.getState().clearTokens();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <AppShellSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        user={user}
      />

      <div className="lg:pl-[19rem]">
        <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[color:rgba(207,223,231,0.92)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-start gap-3">
              <MobileSidebarButton onClick={() => setSidebarOpen(true)} />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-muted)]">
                  Workspace Financeiro
                </p>
                <h1 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                  {meta.title}
                </h1>
                <p className="max-w-3xl text-sm text-[var(--color-muted)]">
                  {meta.description}
                </p>
              </div>
            </div>

            <div className="hidden rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-muted)] shadow-sm md:flex">
              {user?.name || "Usuario"}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
