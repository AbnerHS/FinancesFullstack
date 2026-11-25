import { canonicalCategory, guessCategory } from "./categories.ts"

// Lista colada (do Samsung Notes, WhatsApp, Keep...): um produto por linha.
// - marcadores no início (☐ ☑ ✓ - * • 1. [ ] [x]) são removidos;
// - uma linha terminada em ":" vira a categoria das linhas seguintes;
// - sem cabeçalho, a categoria é sugerida pelo nome do produto;
// - linhas vazias e nomes repetidos (sem diferenciar maiúsculas/acentos) ficam de fora.

const BULLET = /^\s*(?:[-*•·–—>]+|\d+[.)]|\[[\sxX✓✔]?\]|[☐☑☒✓✔✅❌□■▢◻◼▪●○◯]+)\s*/u

const keyOf = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

export function parseItemList(text: string) {
  const items: Array<{ name: string; category: string | null }> = []
  const seen = new Set<string>()
  let header: string | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine
    // Marcadores podem vir em sequência ("- [ ] Arroz").
    for (let guard = 0; guard < 3 && BULLET.test(line); guard++) line = line.replace(BULLET, "")
    line = line.replace(/\s+/g, " ").trim()
    if (!line) continue

    if (line.endsWith(":")) {
      const title = line.slice(0, -1).trim()
      header = title ? canonicalCategory(title.slice(0, 40)) : null
      continue
    }

    const name = line.slice(0, 80)
    const key = keyOf(name)
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ name, category: header ?? guessCategory(name) })
  }
  return items
}
