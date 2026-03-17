import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button.tsx"
import { useTheme } from "@/components/theme-provider.tsx"

const themeOptions = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur-xl">
      {themeOptions.map((option) => {
        const Icon = option.icon
        const active = theme === option.value

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            className={active ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"}
            onClick={() => setTheme(option.value)}
          >
            <Icon size={14} />
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
