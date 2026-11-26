import { useEffect, useState, type RefObject } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Nome do mês fixo no topo, logo abaixo do cabeçalho: aparece quando o título do resumo do mês
 * (`targetRef`) rola para baixo do cabeçalho. Toque abre o seletor de mês.
 *
 * Fica em fluxo como primeiro filho da página, com altura zero e `sticky`: assim acompanha a
 * largura da coluna de conteúdo (ao lado da barra lateral no desktop) sem ocupar espaço.
 */
export function StickyMonthTitle({
  label,
  targetRef,
  onClick,
}: {
  label: string
  targetRef: RefObject<HTMLElement | null>
  onClick?: () => void
}) {
  const [state, setState] = useState({ visible: false, top: 0 })

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const target = targetRef.current
      const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0
      const visible = Boolean(target) && target!.getBoundingClientRect().bottom < headerBottom
      setState((current) =>
        current.visible === visible && current.top === headerBottom
          ? current
          : { visible, top: headerBottom }
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    schedule()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetRef])

  return (
    <div className="pointer-events-none sticky z-10 mb-0 flex h-0 justify-center" style={{ top: state.top }}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        tabIndex={state.visible ? 0 : -1}
        aria-hidden={!state.visible}
        title="Escolher outro mês"
        className={cn(
          "mt-2 inline-flex h-9 items-center gap-1 rounded-full border border-border bg-card pr-3 pl-4 font-serif text-base font-semibold text-foreground capitalize shadow-[0_10px_24px_rgba(15,23,42,0.22)] transition duration-200",
          state.visible
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0"
        )}
      >
        {label}
        <ChevronDown size={16} className="text-muted-foreground" aria-hidden="true" />
      </button>
    </div>
  )
}
