// Par validado (scripts de paleta do dataviz) contra daltonismo nos temas claro e escuro: o
// verde/vermelho do restante da tela se confunde em deuteranopia quando vira área de gráfico.
// Fica fora de charts.tsx para a legenda não puxar o recharts para o bundle principal.
export const EVOLUTION_COLORS = {
  incomes: "#0d9488",
  expenses: "#f43f5e",
  cumulativeBalance: "#64748b",
} as const

// Fatias da rosca de categorias, por posição (maior → menor); os valores claro/escuro ficam em
// index.css. Mais de 5 categorias viram "Outras" (cinza).
export const CATEGORY_SLICE_COLORS = [
  "var(--chart-cat-1)",
  "var(--chart-cat-2)",
  "var(--chart-cat-3)",
  "var(--chart-cat-4)",
  "var(--chart-cat-5)",
] as const
export const CATEGORY_OTHER_COLOR = "var(--chart-cat-other)"
