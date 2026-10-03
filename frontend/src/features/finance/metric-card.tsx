import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export default function MetricCard({
    title,
    value,
    tone,
    icon,
    size = "md",
}: {
    title: string
    value: string
    tone: "positive" | "negative" | "REVENUE" | "EXPENSE" | "NEUTRAL"
    icon: ReactNode
    size?: "sm" | "md" | "lg"
}) {
    const normalizedTone =
        tone === "negative" || tone === "EXPENSE"
            ? "negative"
            : tone === "positive" || tone === "REVENUE"
                ? "positive"
                : "neutral"

    const classes =
        normalizedTone === "positive"
            ? {
                value: "text-emerald-500 dark:text-emerald-400",
                icon: "bg-emerald-500/12 text-emerald-500 dark:text-emerald-400",
            }
            : normalizedTone === "negative"
                ? {
                    value: "text-rose-500 dark:text-rose-400",
                    icon: "bg-rose-500/12 text-rose-500 dark:text-rose-400",
                }
                : { value: "text-foreground", icon: "bg-primary/12 text-primary" }

    const sizeClasses = {
        sm: {
            card: "min-w-0 rounded-2xl px-3 py-2.5",
            container: "gap-3",
            value: "mt-1 text-lg",
            icon: "p-2",
        },
        md: {
            card: "",
            container: "gap-4",
            value: "mt-2 text-2xl",
            icon: "p-3",
        },
        lg: {
            card: "px-5 py-5",
            container: "gap-5",
            value: "mt-2 text-3xl",
            icon: "p-3.5",
        },
    }[size]

    return (
        <Card className={cn("app-panel", sizeClasses.card)}>
            <div className={cn("flex items-center justify-between", sizeClasses.container)}>
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase sm:text-[0.72rem] sm:tracking-[0.28em]">
                        {title}
                    </p>
                    <p className={cn("truncate font-semibold tabular-nums", sizeClasses.value, classes.value)}>
                        {value}
                    </p>
                </div>
                {/* Sem ícone no mobile: em meia largura de tela ele vazava para fora do card. */}
                <div className={cn("hidden shrink-0 rounded-full sm:block", sizeClasses.icon, classes.icon)}>{icon}</div>
            </div>
        </Card>
    )
}