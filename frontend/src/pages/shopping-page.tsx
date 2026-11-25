import { usePlanContext } from "@/features/finance/hooks.ts"
import { ShoppingList } from "@/features/shopping/shopping-list.tsx"

export function ShoppingPage() {
  const { activePlan, userId, participants } = usePlanContext()
  return (
    <ShoppingList
      key={activePlan?.id ?? "none"}
      planId={activePlan?.id ?? null}
      userId={userId ?? null}
      participants={participants}
    />
  )
}
