import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"

import { GoogleAuthCallback } from "@/features/auth/google-auth-callback.tsx"
import { LoginForm } from "@/features/auth/login-form.tsx"
import { requireAuth, requireGuest } from "@/features/auth/auth-guards.ts"
import { SignUpForm } from "@/features/auth/sign-up-form.tsx"
import { AppLayout } from "@/layouts/app-layout.tsx"
import { CardsPage } from "@/pages/cards-page.tsx"
import { DashboardPage } from "@/pages/dashboard-page.tsx"
import { PartnerPage } from "@/pages/partner-page.tsx"
import { PeriodsPage } from "@/pages/periods-page.tsx"
import { PlansPage } from "@/pages/plans-page.tsx"
import { ProfilePage } from "@/pages/profile-page.tsx"

const rootRoute = createRootRoute({
  component: Outlet,
})

const publicRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "public",
  beforeLoad: requireGuest,
  component: Outlet,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/google/callback",
  component: GoogleAuthCallback,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: requireAuth,
  component: AppLayout,
})

const loginRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/login",
  component: LoginForm,
})

const signUpRoute = createRoute({
  getParentRoute: () => publicRoute,
  path: "/sign-up",
  component: SignUpForm,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: DashboardPage,
})

const profileRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/profile",
  component: ProfilePage,
})

const plansRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/plans",
  component: PlansPage,
})

const periodsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/periods",
  component: PeriodsPage,
})

const cardsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/cards",
  component: CardsPage,
})

const partnerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/partner",
  component: PartnerPage,
})

const routeTree = rootRoute.addChildren([
  authCallbackRoute,
  publicRoute.addChildren([loginRoute, signUpRoute]),
  appRoute.addChildren([
    dashboardRoute,
    profileRoute,
    plansRoute,
    periodsRoute,
    cardsRoute,
    partnerRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
