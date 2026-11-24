import { useSyncExternalStore } from "react"

/**
 * Instalação do app pelo navegador.
 *
 * Chrome, Edge e Android disparam `beforeinstallprompt` quando o app pode ser instalado; o evento é
 * guardado aqui (pode chegar antes de o React montar, por isso a captura é no carregamento do
 * módulo) e usado pelo botão "Instalar app". O Safari (iPhone/iPad) não tem esse evento: lá a
 * instalação é manual, por Compartilhar → Adicionar à Tela de Início.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

export function isStandalone() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari no iOS
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone/iPad (inclui iPad que se apresenta como Mac). */
export function isIos() {
  if (typeof navigator === "undefined") return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Sem isto o Chrome mostra a própria barra; o app oferece o botão no menu.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

type InstallState =
  /** Já aberto como app instalado (ou acabou de instalar): nada a oferecer. */
  | "installed"
  /** O navegador oferece a instalação: o botão abre o diálogo nativo. */
  | "prompt"
  /** Safari no iOS: instalação manual pelo menu Compartilhar. */
  | "ios"
  /** Navegador sem suporte ou critério ainda não atendido. */
  | "unavailable"

function snapshot(): InstallState {
  if (installed || isStandalone()) return "installed"
  if (deferredPrompt) return "prompt"
  if (isIos()) return "ios"
  return "unavailable"
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallState() {
  return useSyncExternalStore(subscribe, snapshot, () => "unavailable" as InstallState)
}

/** Abre o diálogo de instalação do navegador. Devolve true se o usuário aceitou. */
export async function promptInstall() {
  const event = deferredPrompt
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  // O evento só pode ser usado uma vez.
  deferredPrompt = null
  notify()
  return outcome === "accepted"
}
