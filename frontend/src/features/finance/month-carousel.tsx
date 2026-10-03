import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import useEmblaCarousel from "embla-carousel-react"
import AutoHeight from "embla-carousel-auto-height"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { Period } from "@/features/finance/types.ts"
import { formatCurrency, formatMonthYear } from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

type CarouselPanel = {
  period: Period
  label: string
  stats: { balance: number }
}

// Arrastar que começa nesses elementos não move o carrossel (alça do dnd-kit, formulários do painel).
const NO_DRAG_SELECTOR = "[data-carousel-no-drag]"
const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

/**
 * Carrossel dos meses do intervalo: um mês por vez (o resumo acompanha o mês visível), com
 * arrastar/swipe, setas laterais, chips de mês, barra de navegação no rodapé (mobile) e teclado.
 */
export function MonthCarousel<Panel extends CarouselPanel>({
  panels,
  activeId,
  onActiveIdChange,
  renderPanel,
}: {
  panels: Panel[]
  activeId: string | null
  onActiveIdChange: (periodId: string) => void
  renderPanel: (panel: Panel) => ReactNode
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "trimSnaps",
      watchDrag: (_api, event) =>
        !(event.target instanceof Element && event.target.closest(NO_DRAG_SELECTOR)),
    },
    [AutoHeight()]
  )
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const [inViewport, setInViewport] = useState(false)

  const panelIds = panels.map((panel) => panel.period.id).join("|")
  const onActiveIdChangeRef = useRef(onActiveIdChange)
  useEffect(() => {
    onActiveIdChangeRef.current = onActiveIdChange
  }, [onActiveIdChange])

  // Sincroniza estado de navegação com o Embla.
  useEffect(() => {
    if (!emblaApi) return

    const sync = () => {
      const index = emblaApi.selectedScrollSnap()
      setSelectedIndex(index)
      setCanPrev(emblaApi.canScrollPrev())
      setCanNext(emblaApi.canScrollNext())
      const id = emblaApi.slideNodes()[index]?.dataset.periodId
      if (id) onActiveIdChangeRef.current(id)
    }

    sync()
    emblaApi.on("select", sync).on("reInit", sync)
    return () => {
      emblaApi.off("select", sync).off("reInit", sync)
    }
  }, [emblaApi])

  // Quando os meses mudam (filtro), mantém o mês ativo ou vai para o mês atual/último.
  useEffect(() => {
    if (!emblaApi || panels.length === 0) return
    const ids = panelIds.split("|")
    const current = new Date()
    const currentId = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
    const candidates = [activeId ? ids.indexOf(activeId) : -1, ids.indexOf(currentId)]
    const index = candidates.find((candidate) => candidate >= 0) ?? ids.length - 1
    emblaApi.reInit()
    emblaApi.scrollTo(index, true)
    // activeId fica de fora de propósito: só reposiciona quando a lista de meses muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, panelIds])

  // Chip ativo centralizado na faixa de meses. Rolagem só horizontal da faixa: scrollIntoView
  // também rolaria a página até o carrossel ao carregar.
  useEffect(() => {
    const list = chipsRef.current
    const chip = list?.querySelector<HTMLElement>(`[data-chip-index="${selectedIndex}"]`)
    if (!list || !chip) return
    const listRect = list.getBoundingClientRect()
    const chipRect = chip.getBoundingClientRect()
    list.scrollTo({
      left: list.scrollLeft + chipRect.left - listRect.left - (list.clientWidth - chipRect.width) / 2,
      behavior: "smooth",
    })
  }, [selectedIndex])

  // A barra flutuante do mobile só aparece enquanto o carrossel está na tela.
  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry?.isIntersecting ?? false), {
      rootMargin: "-80px 0px -120px 0px",
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  if (panels.length === 0) {
    return null
  }

  const multiple = panels.length > 1
  const activePanel = panels[selectedIndex] ?? panels[0]

  return (
    <div
      ref={sectionRef}
      className="space-y-3 outline-none"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Meses do intervalo"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (isEditable(event.target)) return
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      }}
    >
      {multiple ? (
        <div
          ref={chipsRef}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Escolher mês"
        >
          {panels.map((panel, index) => {
            const active = index === selectedIndex
            return (
              <button
                key={panel.period.id}
                type="button"
                role="tab"
                aria-selected={index === selectedIndex}
                data-chip-index={index}
                onClick={() => scrollTo(index)}
                className={cn(
                  "flex shrink-0 flex-col items-start rounded-2xl border px-3 py-2 text-left transition",
                  active
                    ? "border-primary/30 bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(37,99,235,0.22)]"
                    : "border-border bg-card/80 text-foreground hover:border-primary/40"
                )}
              >
                <span className="text-xs font-semibold capitalize">
                  {formatMonthYear(panel.period)}
                </span>
                <span
                  className={cn(
                    "text-[11px]",
                    active
                      ? "text-primary-foreground/80"
                      : panel.stats.balance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                  )}
                >
                  {formatCurrency(panel.stats.balance)}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          {/* items-start: cada mês com a sua altura (o AutoHeight ajusta o viewport). */}
          <div className="-ml-4 flex touch-pan-y items-start transition-[height] duration-300">
            {panels.map((panel, index) => (
              <div
                key={panel.period.id}
                data-period-id={panel.period.id}
                className="min-w-0 shrink-0 grow-0 basis-full pl-4"
                role="group"
                aria-roledescription="slide"
                aria-label={`${panel.label} (${index + 1} de ${panels.length})`}
              >
                {renderPanel(panel)}
              </div>
            ))}
          </div>
        </div>

        {multiple ? (
          <>
            <SideArrow side="left" onClick={scrollPrev} disabled={!canPrev} />
            <SideArrow side="right" onClick={scrollNext} disabled={!canNext} />
          </>
        ) : null}
      </div>

      {multiple ? (
        <div
          className={cn(
            "fixed inset-x-4 bottom-4 z-20 flex items-center justify-between gap-2 rounded-full border border-border bg-card/90 p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.25)] backdrop-blur-xl transition lg:hidden",
            inViewport ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          )}
        >
          <NavButton onClick={scrollPrev} disabled={!canPrev} label="Mês anterior">
            <ChevronLeft size={18} />
          </NavButton>
          <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-foreground">
            {activePanel ? formatMonthYear(activePanel.period) : ""}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {selectedIndex + 1}/{panels.length}
            </span>
          </p>
          <NavButton onClick={scrollNext} disabled={!canNext} label="Próximo mês">
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
  disabled,
}: {
  side: "left" | "right"
  onClick: () => void
  disabled: boolean
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
          disabled={disabled}
          aria-label={side === "left" ? "Mês anterior" : "Próximo mês"}
          className={cn(
            "pointer-events-auto inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-[0_14px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl transition hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-0",
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
  disabled,
  label,
  children,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition hover:text-primary disabled:opacity-35"
    >
      {children}
    </button>
  )
}
