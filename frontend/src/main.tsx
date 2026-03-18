import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"

import "./index.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { queryClient } from "@/lib/query-client.ts"
import { router } from "@/router.tsx"

document.documentElement.lang = "pt-BR"
document.documentElement.setAttribute("translate", "no")
document.documentElement.classList.add("notranslate")
document.body.setAttribute("translate", "no")
document.body.classList.add("notranslate")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
