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
            card: "px-3 py-2",
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
                <div>
                    <p className="app-eyebrow">{title}</p>
                    <p className={cn("font-semibold", sizeClasses.value, classes.value)}>
                        {value}
                    </p>
                </div>
                <div className={cn("rounded-full", sizeClasses.icon, classes.icon)}>{icon}</div>
            </div>
        </Card>
    )
}