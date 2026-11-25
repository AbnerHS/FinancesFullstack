import { useEffect, useRef } from "react"

// Janelas abertas que fecham com Esc, da mais antiga à mais recente. Só a do topo (a última aberta,
// ex.: o seletor de mês sobre o diálogo de fatura) responde, para um Esc não fechar todas juntas.
const stack: symbol[] = []

/**
 * Chama `onEscape` ao apertar Esc enquanto `active`, se esta for a janela mais recente entre as
 * ativas. Ignora o Esc já tratado por outro componente (ex.: o Combobox fechando a lista de
 * sugestões chama preventDefault).
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const handlerRef = useRef(onEscape)
  useEffect(() => {
    handlerRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return
    const token = Symbol("escape-layer")
    stack.push(token)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      if (stack[stack.length - 1] !== token) return
      handlerRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      const index = stack.lastIndexOf(token)
      if (index !== -1) stack.splice(index, 1)
    }
  }, [active])
}
