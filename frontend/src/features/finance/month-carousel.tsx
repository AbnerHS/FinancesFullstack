import { useEffect, useLayoutEffect, useRef, type ReactNode, type TouchEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { Period } from "@/features/finance/types.ts"
import { todayIso } from "@/features/finance/utils.ts"
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
// Arrasto mais longo que essa fração da largura troca de mês mesmo devagar.
const SWIPE_COMMIT_FRACTION = 0.3
// Animação leve: o conteúdo anda metade do dedo (um quinto na ponta, sem mês para ir) e esmaece.
const DRAG_FOLLOW = 0.5
const DRAG_EDGE_FOLLOW = 0.2
const SLIDE_OFFSET = 48
const SLIDE_MS = 160
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

/**
 * Navegação de meses: um mês por vez. Só o mês ativo é renderizado; trocar de mês troca os dados
 * do painel (os meses vizinhos já ficam no cache, então a troca é imediata). Troca por swipe
 * (gesto horizontal), setas laterais (desktop) e teclado (← →). No
 * swipe, o conteúdo acompanha o dedo (metade do deslocamento, esmaecendo) e, ao soltar, o mês novo
 * entra pelo lado oposto ao gesto; setas e teclado trocam sem animação.
 *
 * Antes era um carrossel com vários meses montados lado a lado para o painel acompanhar o dedo; a
 * altura do carrossel precisava ser medida em JS e falhava (sobrava espaço embaixo de meses curtos).
 */
export function MonthCarousel<Panel extends CarouselPanel>({
  panels,
  activeId,
  onActiveIdChange,
  renderPanel,
  header,
  footer,
}: {
  panels: Panel[]
  activeId: string | null
  onActiveIdChange: (periodId: string) => void
  /** `near` é sempre true: só o mês ativo é renderizado. */
  renderPanel: (panel: Panel, near: boolean) => ReactNode
  /**
   * Conteúdo acima do painel (filtros, resumo do mês). Fica dentro da área de navegação: o swipe,
   * as setas laterais (desktop) valem desde o topo da página. Não é recriado ao trocar
   * de mês.
   */
  header?: ReactNode
  /** Conteúdo abaixo do painel (previsto × real): também dentro da área do swipe. */
  footer?: ReactNode
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const touchRef = useRef<{
    x: number
    y: number
    time: number
    /** Gesto já reconhecido como horizontal (o conteúdo acompanha o dedo). */
    dragging: boolean
  } | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<number | null>(null)
  // Mês novo a animar ao entrar: lado de onde vem (1 = da direita), definido ao soltar o swipe.
  const enterFromRef = useRef<1 | -1 | null>(null)

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

  const go = (delta: 1 | -1) => {
    const target = panels[index + delta]
    if (!target) return
    // Sem rolar a página: o mês novo aparece na mesma posição vertical.
    onActiveIdChange(target.period.id)
  }

  // Estilos aplicados direto no elemento (sem re-render a cada quadro do arrasto). Em repouso o
  // transform fica vazio: um transform no ancestral prenderia os elementos `fixed` do painel.
  const setContentStyle = (offset: number, transition: boolean) => {
    const node = contentRef.current
    if (!node) return
    const width = node.offsetWidth || 1
    node.style.transition = transition
      ? `transform ${SLIDE_MS}ms ease-out, opacity ${SLIDE_MS}ms ease-out`
      : "none"
    node.style.transform = offset ? `translate3d(${offset}px, 0, 0)` : ""
    node.style.opacity = offset ? String(Math.max(0.35, 1 - (Math.abs(offset) / width) * 1.5)) : ""
    node.style.willChange = offset ? "transform, opacity" : ""
  }
  const clearAnimation = () => {
    if (animationRef.current !== null) window.clearTimeout(animationRef.current)
    animationRef.current = null
  }
  useEffect(() => clearAnimation, [])

  // Solta o arrasto: sem mês para ir (ou gesto curto), volta ao lugar. Trocando, o conteúdo antigo
  // sai para o lado do gesto enquanto o mês novo monta, e o novo entra pelo outro lado assim que
  // aparece na tela.
  const finishDrag = (delta: 1 | -1 | 0) => {
    clearAnimation()
    if (!delta || !panels[index + delta]) {
      setContentStyle(0, true)
      animationRef.current = window.setTimeout(() => setContentStyle(0, false), SLIDE_MS)
      return
    }
    // A saída do conteúdo antigo começa já (transform/opacity animam fora da thread principal) e o
    // mês troca no quadro seguinte: o tempo de montar o mês novo fica coberto pela saída.
    setContentStyle(-delta * SLIDE_OFFSET, true)
    enterFromRef.current = delta
    requestAnimationFrame(() => {
      animationRef.current = window.setTimeout(() => go(delta), 0)
    })
  }

  useLayoutEffect(() => {
    const from = enterFromRef.current
    enterFromRef.current = null
    if (!from) return
    setContentStyle(from * SLIDE_OFFSET, false)
    // Força o layout na posição inicial antes de animar a entrada.
    void contentRef.current?.offsetWidth
    setContentStyle(0, true)
    animationRef.current = window.setTimeout(() => setContentStyle(0, false), SLIDE_MS)
  }, [shownId])

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
    touchRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now(), dragging: false }
  }
  const onTouchMove = (event: TouchEvent) => {
    const start = touchRef.current
    const touch = event.touches[0]
    if (!start || !touch || prefersReducedMotion()) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (!start.dragging) {
      // Decide o eixo nos primeiros pixels: rolagem vertical não mexe no conteúdo.
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) {
        touchRef.current = null
        return
      }
      start.dragging = true
      clearAnimation()
    }
    const hasTarget = Boolean(panels[index + (dx < 0 ? 1 : -1)])
    setContentStyle(dx * (hasTarget ? DRAG_FOLLOW : DRAG_EDGE_FOLLOW), false)
  }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchRef.current
    touchRef.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    const width = contentRef.current?.offsetWidth ?? window.innerWidth
    const swiped =
      Math.abs(dx) >= SWIPE_MIN_DISTANCE &&
      Math.abs(dx) >= Math.abs(dy) * SWIPE_RATIO &&
      (Date.now() - start.time <= SWIPE_MAX_DURATION || Math.abs(dx) >= width * SWIPE_COMMIT_FRACTION)
    const delta = swiped ? (dx < 0 ? 1 : -1) : 0
    if (start.dragging) finishDrag(delta)
    else if (delta) go(delta)
  }
  const onTouchCancel = () => {
    if (touchRef.current?.dragging) finishDrag(0)
    touchRef.current = null
  }

  if (!activePanel) {
    return null
  }

  const multiple = panels.length > 1

  return (
    <div
      ref={sectionRef}
      className="outline-none"
      role="region"
      aria-label="Navegação por mês"
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
        {/* pan-y: o navegador cuida só da rolagem vertical; o gesto horizontal fica com o carrossel. */}
        <div
          className="touch-pan-y touch-pinch-zoom"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          <div ref={contentRef}>
            {header}
            {/* Trocar de mês só troca os dados do painel (esqueleto enquanto o mês carrega); o
                arrasto só desliza e esmaece o conteúdo. A chave recria o painel para o estado de
                um mês (formulário aberto, busca) não passar para o outro. */}
            <div key={activePanel.period.id} role="group" aria-label={activePanel.label}>
              {renderPanel(activePanel, true)}
            </div>
            {footer}
          </div>
        </div>

        {multiple ? (
          <>
            <SideArrow side="left" onClick={() => go(-1)} />
            <SideArrow side="right" onClick={() => go(1)} />
          </>
        ) : null}
      </div>

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
