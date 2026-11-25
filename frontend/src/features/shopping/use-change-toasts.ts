import { useCallback, useEffect, useRef, useState } from "react"

import type { RemoteChange } from "./hooks.ts"

export type Toast = { id: number; kind: RemoteChange["kind"]; text: string }

const TOAST_DURATION = 4500
const MAX_TOASTS = 3

const VERB: Record<RemoteChange["kind"], [one: string, many: string]> = {
  checked: ["marcou", "marcou"],
  unchecked: ["desmarcou", "desmarcou"],
  added: ["adicionou", "adicionou"],
  removed: ["removido da lista", "removidos da lista"],
}

/** "Ana marcou Leite", "Ana marcou 5 itens", "Leite foi removido da lista". */
function describe(kind: RemoteChange["kind"], changes: RemoteChange[], personName: string) {
  const many = changes.length > 1
  const subject = many ? `${changes.length} itens` : changes[0]!.item.name
  if (kind === "removed") return `${subject} ${many ? "foram" : "foi"} ${VERB.removed[many ? 1 : 0]}`
  return `${personName} ${VERB[kind][0]} ${subject}`
}

/**
 * Avisos do que a outra pessoa fez na lista (a lista se atualiza sozinha a cada poucos segundos).
 * Fica acima da barra inferior no celular.
 */
export function useChangeToasts(nameOf: (userId: string | null) => string) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => clearTimeout(timer))
  }, [])

  const notify = useCallback(
    (changes: RemoteChange[]) => {
      // Um aviso por pessoa e tipo de alteração ("Ana marcou 5 itens", não cinco avisos).
      const groups = new Map<string, RemoteChange[]>()
      for (const change of changes) {
        const key = `${change.userId ?? ""}|${change.kind}`
        groups.set(key, [...(groups.get(key) ?? []), change])
      }
      const created = [...groups.values()].map((group) => ({
        id: ++nextId.current,
        kind: group[0]!.kind,
        text: describe(group[0]!.kind, group, nameOf(group[0]!.userId)),
      }))
      setToasts((current) => [...current, ...created].slice(-MAX_TOASTS))
      for (const toast of created) {
        timers.current.set(
          toast.id,
          setTimeout(() => dismiss(toast.id), TOAST_DURATION)
        )
      }
    },
    [dismiss, nameOf]
  )

  return { toasts, notify, dismiss }
}

