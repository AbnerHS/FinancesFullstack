import { useEffect, useRef } from "react"

/**
 * Chama `onEscape` ao apertar Esc enquanto `active`. Ignora o Esc já tratado por outro componente
 * (ex.: o Combobox fechando a lista de sugestões chama preventDefault).
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const handlerRef = useRef(onEscape)
  useEffect(() => {
    handlerRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return
      handlerRef.current()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [active])
}
