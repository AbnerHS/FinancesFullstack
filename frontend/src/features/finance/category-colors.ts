const pieColors = [
  "#60a5fa",
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#f472b6",
  "#facc15",
  "#2dd4bf",
  "#818cf8",
  "#4ade80",
  "#fb7185",
  "#38bdf8",
  "#c084fc",
  "#f59e0b",
  "#14b8a6",
  "#a3e635",
] as const

function hexToRgb(hexColor: string) {
  const normalized = hexColor.replace("#", "")
  const value = Number.parseInt(normalized, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function stringToColorIndex(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash % pieColors.length
}

export function getCategoryColor(categoryName?: string | null) {
  const normalized = (categoryName || "Sem categoria").trim() || "Sem categoria"
  return pieColors[stringToColorIndex(normalized)]
}

export function getCategoryBadgeStyle(categoryName?: string | null) {
  const color = getCategoryColor(categoryName)
  const { r, g, b } = hexToRgb(color)

  return {
    borderColor: `rgba(${r}, ${g}, ${b}, 0.28)`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    color,
  }
}

export { pieColors }
