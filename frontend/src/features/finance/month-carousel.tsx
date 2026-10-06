import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { Period } from "@/features/finance/types.ts"
import { formatMonthYear } from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

type CarouselPanel = {
  period: Period
  label: string
}

// Arrastar que começa nesses elementos não move o carrossel (alça do dnd-kit, formulários do painel).
const NO_DRAG_SELECTOR = "[data-carousel-no-drag]"
// Meses renderizados de cada lado do mês parado; os demais ficam com content-visibility: hidden.
const VISIBLE_RADIUS = 1
const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))

/**
 * Carrossel de meses: um mês por vez (o resumo acompanha o mês visível), com arrastar/swipe,
 * setas laterais, barra de navegação no rodapé (mobile) e teclado. A página passa só o mês ativo
 * e os vizinhos; ao parar num vizinho, a janela se recentra nele.
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
  /** `near`: o mês parado ou um vizinho dele; os demais podem renderizar algo leve (esqueleto). */
  renderPanel: (panel: Panel, near: boolean) => ReactNode
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    duration: 20,
    containScroll: "trimSnaps",
    watchDrag: (_api, event) =>
      !(event.target instanceof Element && event.target.closest(NO_DRAG_SELECTOR)),
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Mês em que o carrossel parou. Só ele e os vizinhos são renderizados (ver `slides`).
  const [settledIndex, setSettledIndex] = useState(0)
  // Destino do swipe, atualizado numa transição (selectedIndex é urgente, para a barra do rodapé).
  const [targetIndex, setTargetIndex] = useState(0)
  // Toques de seta na borda antes de a janela se recentrar (+ para frente, - para trás):
  // aplicados logo depois.
  const pendingMoveRef = useRef(0)
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const [inViewport, setInViewport] = useState(false)

  const panelIds = panels.map((panel) => panel.period.id).join("|")
  const onActiveIdChangeRef = useRef(onActiveIdChange)
  useEffect(() => {
    onActiveIdChangeRef.current = onActiveIdChange
  }, [onActiveIdChange])

  // Sincroniza estado de navegação com o Embla.
  useEffect(() => {
    if (!emblaApi) return

    // Destino do swipe: a barra do rodapé troca na hora; o painel completo do destino (e vizinhos)
    // monta numa transição, interrompível, sem travar a animação (ver `slides`).
    const sync = () => {
      const index = emblaApi.selectedScrollSnap()
      setSelectedIndex(index)
      startTransition(() => setTargetIndex(index))
    }
    // Avisar a página re-renderiza o dashboard inteiro (resumo, painéis, gráficos). Feito no meio
    // da animação, isso travava o slide; por isso só acontece quando o carrossel para.
    const notify = () => {
      const index = emblaApi.selectedScrollSnap()
      const id = emblaApi.slideNodes()[index]?.dataset.periodId
      startTransition(() => {
        setSettledIndex(index)
        if (id) onActiveIdChangeRef.current(id)
      })
    }
    const syncAndNotify = () => {
      sync()
      notify()
    }

    syncAndNotify()
    emblaApi.on("select", sync).on("settle", notify).on("reInit", syncAndNotify)
    return () => {
      emblaApi.off("select", sync).off("settle", notify).off("reInit", syncAndNotify)
    }
  }, [emblaApi])

  // Altura do carrossel = altura do mês visível, acompanhando qualquer mudança de tamanho do slide
  // (o plugin AutoHeight do Embla media os slides uma vez só, antes das transações carregarem).
  // Sem transição de altura: animar height refaz o layout da página inteira a cada quadro do
  // slide. Ao selecionar, só cresce (o mês de destino não aparece cortado); encolhe ao parar.
  useEffect(() => {
    if (!emblaApi) return
    const container = emblaApi.containerNode()
    const activeSlide = () => emblaApi.slideNodes()[emblaApi.selectedScrollSnap()]
    // 0 = slide ainda com content-visibility: hidden (logo depois de a janela se recentrar, antes de
    // re-renderizar): ignora, em vez de zerar a altura do carrossel por um instante.
    const activeHeight = () => activeSlide()?.offsetHeight || null

    const fit = () => {
      // Mês ainda carregando (esqueleto): não encolhe; ajusta quando o conteúdo chegar.
      if (activeSlide()?.querySelector('[aria-busy="true"]')) return grow()
      const height = activeHeight()
      if (height !== null) container.style.height = `${height}px`
    }
    const grow = () => {
      const height = activeHeight()
      if (height !== null && height > container.offsetHeight) container.style.height = `${height}px`
    }

    let moving = false
    const onSelect = () => {
      moving = true
      grow()
    }
    const onSettle = () => {
      moving = false
      fit()
    }

    const observer = new ResizeObserver(() => (moving ? grow() : fit()))
    const observeSlides = () => {
      // reInit (janela recentrada) salta sem animação e não emite "settle".
      moving = false
      observer.disconnect()
      emblaApi.slideNodes().forEach((slide) => observer.observe(slide))
      fit()
    }

    observeSlides()
    emblaApi.on("select", onSelect).on("settle", onSettle).on("reInit", observeSlides)
    return () => {
      emblaApi.off("select", onSelect).off("settle", onSettle).off("reInit", observeSlides)
      observer.disconnect()
      container.style.height = ""
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
    // O salto instantâneo não emite "settle": mostra o mês e avisa a página aqui mesmo.
    setSettledIndex(index)
    setTargetIndex(index)
    const id = ids[index]
    if (id) onActiveIdChangeRef.current(id)
    const pending = pendingMoveRef.current
    if (pending !== 0) {
      const target = Math.min(Math.max(index + pending, 0), ids.length - 1)
      pendingMoveRef.current = pending - (target - index)
      emblaApi.scrollTo(target)
    }
    // activeId fica de fora de propósito: só reposiciona quando a lista de meses muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi, panelIds])

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

  // `near` (mês parado, destino do swipe e vizinhos) recebe o painel completo, se os dados já
  // estiverem no cache; os outros, algo leve (esqueleto). Meses longe do parado e do destino recebem
  // content-visibility: hidden (o navegador pula layout e pintura deles): com muitos meses montados,
  // o Chrome recalculava as camadas da árvore toda a cada quadro do slide.
  // Painéis com memo: trocar selectedIndex só muda a classe dos slides.
  const slides = useMemo(
    () =>
      panels.map((panel, index) => (
        <div
          key={panel.period.id}
          data-period-id={panel.period.id}
          className={cn(
            "min-w-0 shrink-0 grow-0 basis-full pl-4",
            Math.abs(index - settledIndex) > VISIBLE_RADIUS &&
              Math.abs(index - selectedIndex) > VISIBLE_RADIUS &&
              "[content-visibility:hidden]"
          )}
          role="group"
          aria-roledescription="slide"
          aria-label={panel.label}
        >
          {renderPanel(
            panel,
            Math.abs(index - settledIndex) <= VISIBLE_RADIUS ||
              Math.abs(index - targetIndex) <= VISIBLE_RADIUS
          )}
        </div>
      )),
    [panels, renderPanel, selectedIndex, settledIndex, targetIndex]
  )

  // A página sempre tem mais meses (a janela se recentra ao parar), então as setas nunca ficam
  // desabilitadas: na borda, o toque espera a janela andar.
  const scrollPrev = useCallback(() => {
    if (!emblaApi) return
    if (emblaApi.canScrollPrev()) emblaApi.scrollPrev()
    else pendingMoveRef.current -= 1
  }, [emblaApi])
  const scrollNext = useCallback(() => {
    if (!emblaApi) return
    if (emblaApi.canScrollNext()) emblaApi.scrollNext()
    else pendingMoveRef.current += 1
  }, [emblaApi])
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
      aria-label="Transações por mês"
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
      <div className="relative">
        {/* transform neutro na área visível: o reInit do Embla limpa o transform do trilho por um
            instante, e sem nenhum transform ali o Chrome em celular/tablet zerava a rolagem da página
            (ia para o topo ao trocar de mês). Fica aqui, e não no trilho, porque transform muda a
            referência do offsetLeft que o Embla usa para medir os slides. */}
        <div className="overflow-hidden [transform:translate3d(0,0,0)]" ref={emblaRef}>
          {/* items-start: cada mês com a sua altura (a altura acompanha o mês visível). */}
          <div className="-ml-4 flex touch-pan-y items-start">
            {slides}
          </div>
        </div>

        {multiple ? (
          <>
            <SideArrow side="left" onClick={scrollPrev} />
            <SideArrow side="right" onClick={scrollNext} />
          </>
        ) : null}
      </div>

      {multiple ? (
        <div
          className={cn(
            "fixed inset-x-4 bottom-4 z-20 flex items-center justify-between gap-2 rounded-full border border-border bg-card p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.25)] transition lg:hidden",
            inViewport ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          )}
        >
          <NavButton onClick={scrollPrev} label="Mês anterior">
            <ChevronLeft size={18} />
          </NavButton>
          <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-foreground">
            {activePanel ? formatMonthYear(activePanel.period) : ""}
          </p>
          <NavButton onClick={scrollNext} label="Próximo mês">
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
