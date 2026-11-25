import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { financeKeys, shoppingService } from "@/features/finance/services.ts"
import type { ShoppingItem, ShoppingItemPayload } from "@/features/finance/types.ts"
import { getErrorMessage } from "@/lib/errors.ts"

/** Com a tela aberta, a lista se atualiza sozinha: quem está no mercado vê o que o outro marcou. */
const LIVE_INTERVAL = 4000

const EMPTY: ShoppingItem[] = []

/** Alteração feita por outra pessoa, percebida na atualização da lista. */
export type RemoteChange = {
  kind: "checked" | "unchecked" | "added" | "removed"
  item: ShoppingItem
  /** Quem alterou (null em exclusões: o servidor não guarda quem excluiu). */
  userId: string | null
}

/**
 * Compara duas respostas do servidor. Alterações do próprio usuário (updatedBy) ficam de fora; uma
 * exclusão só conta se o item ainda está na tela (a exclusão local já o tirou antes).
 */
function diffSnapshots(
  previous: ShoppingItem[],
  next: ShoppingItem[],
  userId: string | null | undefined,
  onScreen: ShoppingItem[] | undefined
): RemoteChange[] {
  const before = new Map(previous.map((item) => [item.id, item]))
  const after = new Set(next.map((item) => item.id))
  const changes: RemoteChange[] = []
  for (const item of next) {
    if (item.updatedBy === userId) continue
    const old = before.get(item.id)
    if (!old) changes.push({ kind: "added", item, userId: item.updatedBy })
    else if (old.checked !== item.checked) {
      changes.push({ kind: item.checked ? "checked" : "unchecked", item, userId: item.updatedBy })
    }
  }
  for (const item of previous) {
    if (!after.has(item.id) && onScreen?.some((shown) => shown.id === item.id)) {
      changes.push({ kind: "removed", item, userId: null })
    }
  }
  return changes
}

export function useShoppingItems(
  planId: string | null | undefined,
  userId?: string | null,
  onRemoteChanges?: (changes: RemoteChange[]) => void
) {
  const queryClient = useQueryClient()
  // Última resposta do servidor (não o cache, que tem as alterações otimistas desta tela).
  const serverSnapshot = useRef<ShoppingItem[] | null>(null)
  const listener = useRef(onRemoteChanges)
  useEffect(() => {
    listener.current = onRemoteChanges
  })

  const query = useQuery({
    queryKey: financeKeys.shoppingItems(planId),
    queryFn: async () => {
      const next = await shoppingService.list(planId!)
      const previous = serverSnapshot.current
      serverSnapshot.current = next
      if (previous) {
        const onScreen = queryClient.getQueryData<ShoppingItem[]>(financeKeys.shoppingItems(planId))
        const changes = diffSnapshots(previous, next, userId, onScreen)
        if (changes.length > 0) listener.current?.(changes)
      }
      return next
    },
    enabled: Boolean(planId),
    // Pausa enquanto uma alteração está a caminho, para a resposta antiga não desfazer o toque.
    refetchInterval: () =>
      queryClient.isMutating({ mutationKey: ["shopping", planId] }) > 0 ? false : LIVE_INTERVAL,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
  return { ...query, items: query.data ?? EMPTY }
}

/**
 * Alterações da lista com resposta imediata na tela (otimista): no mercado o sinal oscila, e o
 * toque não pode esperar a rede. Marcar grava o valor, não inverte.
 */
export function useShoppingMutations(planId: string | null | undefined) {
  const queryClient = useQueryClient()
  const key = financeKeys.shoppingItems(planId)
  const mutationKey = ["shopping", planId]

  const patchCache = async (change: (items: ShoppingItem[]) => ShoppingItem[]) => {
    await queryClient.cancelQueries({ queryKey: key })
    const previous = queryClient.getQueryData<ShoppingItem[]>(key)
    if (previous) queryClient.setQueryData(key, change(previous))
    return { previous }
  }
  const rollback = (_error: unknown, _variables: unknown, context?: { previous?: ShoppingItem[] }) => {
    if (context?.previous) queryClient.setQueryData(key, context.previous)
  }
  // Recarrega só depois da última alteração pendente (tocar vários itens seguidos).
  const settle = () => {
    if (queryClient.isMutating({ mutationKey }) <= 1) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const update = useMutation({
    mutationKey,
    mutationFn: ({ id, payload }: { id: string; payload: ShoppingItemPayload }) =>
      shoppingService.update(id, payload),
    onMutate: ({ id, payload }) =>
      patchCache((items) =>
        items.map((item) => {
          if (item.id !== id) return item
          const next = { ...item, ...payload } as ShoppingItem
          if (next.checked) next.note = null
          return next
        })
      ),
    onError: rollback,
    onSettled: settle,
  })

  const create = useMutation({
    mutationKey,
    mutationFn: (items: Array<ShoppingItemPayload & { name: string }>) => {
      if (!planId) throw new Error("Selecione um plano.")
      return shoppingService.create(planId, items)
    },
    onSuccess: ({ created }) => {
      const previous = queryClient.getQueryData<ShoppingItem[]>(key) ?? []
      queryClient.setQueryData(key, [...previous, ...created])
    },
    onSettled: settle,
  })

  const setAll = useMutation({
    mutationKey,
    mutationFn: (checked: boolean) => {
      if (!planId) throw new Error("Selecione um plano.")
      return shoppingService.setAll(planId, checked)
    },
    onMutate: (checked) =>
      patchCache((items) =>
        items.map((item) => ({ ...item, checked, note: checked ? null : item.note }))
      ),
    onError: rollback,
    onSettled: settle,
  })

  const remove = useMutation({
    mutationKey,
    mutationFn: (id: string) => shoppingService.delete(id),
    onMutate: (id) => patchCache((items) => items.filter((item) => item.id !== id)),
    onError: rollback,
    onSettled: settle,
  })

  const error = update.error ?? create.error ?? setAll.error ?? remove.error
  return {
    update,
    create,
    setAll,
    remove,
    errorMessage: error ? getErrorMessage(error, "Não foi possível salvar a lista.") : null,
  }
}

type SessionState = { ids: string[]; startedAt: string }

const sessionKey = (planId: string) => `finances:shopping-session:${planId}`

function readSession(planId: string | null | undefined): SessionState | null {
  if (!planId) return null
  try {
    const raw = localStorage.getItem(sessionKey(planId))
    const parsed = raw ? (JSON.parse(raw) as SessionState) : null
    return parsed && Array.isArray(parsed.ids) ? parsed : null
  } catch {
    return null
  }
}

function writeSession(planId: string, session: SessionState | null) {
  try {
    if (session) localStorage.setItem(sessionKey(planId), JSON.stringify(session))
    else localStorage.removeItem(sessionKey(planId))
  } catch {
    // Sem armazenamento (aba privada): a compra vale só enquanto a tela estiver aberta.
  }
}

/**
 * "No mercado": a compra mostra o que faltava ao começar e tudo que for desmarcado depois (inclusive
 * pelo outro celular). O que entra no carrinho continua visível, riscado, até concluir. Fica salvo
 * no aparelho, para sobreviver a recarregar a página no meio do mercado.
 */
export function useShoppingSession(planId: string | null | undefined, items: ShoppingItem[], ready: boolean) {
  // A tela recria o componente ao trocar de plano (key), então o plano não muda aqui.
  const [session, setSession] = useState<SessionState | null>(() => readSession(planId))

  // Itens desmarcados durante a compra entram nela (ajuste no render, sem efeito em cascata).
  if (session && ready) {
    const known = new Set(session.ids)
    const added = items.filter((item) => !item.checked && !known.has(item.id)).map((item) => item.id)
    if (added.length > 0) setSession({ ...session, ids: [...session.ids, ...added] })
  }

  useEffect(() => {
    if (planId) writeSession(planId, session)
  }, [planId, session])

  const ids = useMemo(() => new Set(session?.ids ?? []), [session])

  return {
    active: Boolean(session),
    ids,
    start: () =>
      setSession({
        ids: items.filter((item) => !item.checked).map((item) => item.id),
        startedAt: new Date().toISOString(),
      }),
    finish: () => setSession(null),
  }
}

/** Mantém a tela acesa durante a compra (onde o navegador permitir). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        if (document.visibilityState !== "visible") return
        const next = await navigator.wakeLock.request("screen")
        if (cancelled) void next.release()
        else lock = next
      } catch {
        // Sem permissão ou bateria fraca: segue sem manter a tela acesa.
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire()
    }
    void acquire()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisibility)
      void lock?.release()
    }
  }, [enabled])
}
