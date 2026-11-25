import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { Period } from "@/features/finance/types.ts"
import { formatMonthYear, todayIso } from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

type CarouselPanel = {
  period: Period
  label: string
}

// Gesto que começa nesses elementos não troca de mês (alça do dnd-kit, formulários do painel).
const NO_DRAG_SELECTOR = "[data-carousel-no-drag]"
// Swipe: deslocamento horizontal mínimo (px), predominância sobre o vertical e duração máxima (ms).
const SWIPE_MIN_DISTANCE = 60
const SWIPE_RATIO = 1.5
const SWIPE_MAX_DURATION = 800
const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

/**
 * Navegação de meses: um mês por vez. Só o mês ativo é renderizado; trocar de mês troca os dados
 * do painel (os meses vizinhos já ficam no cache, então a troca é imediata). Troca por swipe
 * (gesto horizontal), setas laterais (desktop), barra no rodapé (mobile) e teclado (← →), sem
 * animação: os dados do painel são trocados, com esqueleto enquanto o mês carrega.
 *
 * Antes era um carrossel com vários meses montados lado a lado para o painel acompanhar o dedo; a
 * altura do carrossel precisava ser medida em JS e falhava (sobrava espaço embaixo de meses curtos).
 */
export function MonthCarousel<Panel extends CarouselPanel>({
  panels,
  activeId,
  onActiveIdChange,
  renderPanel,
  onLabelClick,
}: {
  panels: Panel[]
  activeId: string | null
  onActiveIdChange: (periodId: string) => void
  /** Toque no nome do mês da barra flutuante (abre o seletor de mês). */
  onLabelClick?: () => void
  /** `near` é sempre true: só o mês ativo é renderizado. */
  renderPanel: (panel: Panel, near: boolean) => ReactNode
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const touchRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [inViewport, setInViewport] = useState(false)

  // Mês ativo; sem ele na lista (outro plano, filtro), o mês atual ou o último.
  const currentId = todayIso().slice(0, 7)
  const index = (() => {
    const active = activeId ? panels.findIndex((panel) => panel.period.id === activeId) : -1
    if (active >= 0) return active
    const current = panels.findIndex((panel) => panel.period.id === currentId)
    return current >= 0 ? current : panels.length - 1
  })()
  const activePanel = panels[index]

  // Avisa a página quando o mês exibido não é o pedido (para o resumo acompanhar).
  const shownId = activePanel?.period.id
  useEffect(() => {
    if (shownId && shownId !== activeId) onActiveIdChange(shownId)
  }, [activeId, onActiveIdChange, shownId])

  // A barra flutuante do mobile só aparece enquanto o painel está na tela.
  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry?.isIntersecting ?? false), {
      rootMargin: "-80px 0px -120px 0px",
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const go = (delta: 1 | -1) => {
    const target = panels[index + delta]
    if (!target) return
    onActiveIdChange(target.period.id)
    // Trocando de mês com o painel rolado para baixo (ex.: pela barra do rodapé), volta ao topo
    // do painel: o mês novo começa do início, não no meio da tabela.
    const top = sectionRef.current?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollBy({ top: top - 96, behavior: "instant" as ScrollBehavior })
  }

  const onTouchStart = (event: TouchEvent) => {
    const target = event.target
    if (
      event.touches.length !== 1 ||
      (target instanceof Element && target.closest(NO_DRAG_SELECTOR)) ||
      isEditable(target)
    ) {
      touchRef.current = null
      return
    }
    const touch = event.touches[0]!
    touchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchRef.current
    touchRef.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (
      Math.abs(dx) >= SWIPE_MIN_DISTANCE &&
      Math.abs(dx) >= Math.abs(dy) * SWIPE_RATIO &&
      Date.now() - start.time <= SWIPE_MAX_DURATION
    ) {
      go(dx < 0 ? 1 : -1)
    }
  }

  if (!activePanel) {
    return null
  }

  const multiple = panels.length > 1

  return (
    <div
      ref={sectionRef}
      className="space-y-3 outline-none"
      role="region"
      aria-label="Transações por mês"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (isEditable(event.target)) return
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          go(-1)
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          go(1)
        }
      }}
    >
      <div className="relative">
        <div className="overflow-x-clip" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* Sem animação: trocar de mês só troca os dados do painel (esqueleto enquanto o mês
              carrega). A chave recria o painel para o estado de um mês (formulário aberto, busca)
              não passar para o outro. */}
          <div key={activePanel.period.id} role="group" aria-label={activePanel.label}>
            {renderPanel(activePanel, true)}
          </div>
        </div>

        {multiple ? (
          <>
            <SideArrow side="left" onClick={() => go(-1)} />
            <SideArrow side="right" onClick={() => go(1)} />
          </>
        ) : null}
      </div>

      {multiple ? (
        <div
          className={cn(
            "fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-2 rounded-full border border-border bg-card p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.25)] transition lg:hidden",
            inViewport ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          )}
        >
          <NavButton onClick={() => go(-1)} label="Mês anterior">
            <ChevronLeft size={18} />
          </NavButton>
          {onLabelClick ? (
            <button
              type="button"
              onClick={onLabelClick}
              className="min-w-0 flex-1 truncate rounded-full py-2 text-center text-sm font-semibold capitalize text-foreground active:bg-secondary"
              aria-label="Escolher mês"
            >
              {formatMonthYear(activePanel.period)}
            </button>
          ) : (
            <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-foreground">
              {formatMonthYear(activePanel.period)}
            </p>
          )}
          <NavButton onClick={() => go(1)} label="Próximo mês">
            <ChevronRight size={18} />
          </NavButton>
        </div>
      ) : null}
    </div>
  )
}

/** Seta lateral (desktop) que acompanha a rolagem do painel: coluna absoluta + botão sticky. */
function SideArrow({
  side,
  onClick,
}: {
  side: "left" | "right"
  onClick: () => void
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 hidden w-0 lg:block",
        side === "left" ? "left-0" : "right-0"
      )}
    >
      {/* A coluna tem largura zero na borda do painel. Na direita, o botão é alinhado pelo fim
          para a caixa de layout transbordar para dentro (senão gera rolagem horizontal na página);
          o translate só centraliza o botão sobre a borda. */}
      <div
        className={cn(
          "sticky top-[calc(50vh-1.5rem)] flex py-6",
          side === "right" && "justify-end"
        )}
      >
        <button
          type="button"
          onClick={onClick}
          aria-label={side === "left" ? "Mês anterior" : "Próximo mês"}
          className={cn(
            "pointer-events-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:border-primary/40 hover:text-primary",
            side === "left" ? "-translate-x-1/2" : "translate-x-1/2"
          )}
        >
          {side === "left" ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
    </div>
  )
}

function NavButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition hover:text-primary"
    >
      {children}
    </button>
  )
}
