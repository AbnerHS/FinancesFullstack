import {
  Apple,
  Baby,
  Bath,
  Beef,
  Croissant,
  Cookie,
  CupSoda,
  Milk,
  Package,
  PawPrint,
  Snowflake,
  SprayCan,
  Wheat,
  type LucideIcon,
} from "lucide-react"

import type { PillTone } from "@/components/ui/pill-styles.ts"

/**
 * Categorias do mercado. A ordem é a de um percurso comum no mercado: a lista agrupa nessa ordem.
 * Categorias criadas pelo usuário entram depois, e "Outros" (sem categoria) fica no fim.
 */
export type ShoppingCategory = {
  name: string
  icon: LucideIcon
  /** Cor do ícone e do título do grupo. */
  text: string
  /** Fundo do ícone. */
  soft: string
  /** Linha do produto marcado (tem em casa / no carrinho). */
  row: string
  /** Linha do produto que falta: fundo mais forte e borda. */
  rowMissing: string
  /** Caixa marcada. */
  box: string
  /** Caixa vazia (falta). */
  boxEmpty: string
  tone: PillTone
  /** Palavras (sem acento, minúsculas) que sugerem a categoria pelo nome do produto. */
  keywords: string[]
}

const tone = (color: string): Pick<ShoppingCategory, "text" | "soft" | "tone" | "row" | "rowMissing" | "box" | "boxEmpty"> => {
  // Classes escritas por extenso para o Tailwind encontrá-las.
  const palette: Record<string, Pick<ShoppingCategory, "text" | "soft" | "tone" | "row" | "rowMissing" | "box" | "boxEmpty">> = {
    green: {
      text: "text-green-700 dark:text-green-400",
      soft: "bg-green-500/12",
      row: "border-transparent bg-green-500/7",
      rowMissing: "border-green-500/45 bg-green-500/14",
      box: "border-green-500 bg-green-500 text-white",
      boxEmpty: "border-green-500/70 bg-card",
      tone: { selected: "border-green-500/45 bg-green-500/12 text-green-700 dark:text-green-300", hover: "hover:border-green-500/45" },
    },
    red: {
      text: "text-red-700 dark:text-red-400",
      soft: "bg-red-500/12",
      row: "border-transparent bg-red-500/7",
      rowMissing: "border-red-500/45 bg-red-500/14",
      box: "border-red-500 bg-red-500 text-white",
      boxEmpty: "border-red-500/70 bg-card",
      tone: { selected: "border-red-500/45 bg-red-500/12 text-red-700 dark:text-red-300", hover: "hover:border-red-500/45" },
    },
    sky: {
      text: "text-sky-700 dark:text-sky-400",
      soft: "bg-sky-500/12",
      row: "border-transparent bg-sky-500/7",
      rowMissing: "border-sky-500/45 bg-sky-500/14",
      box: "border-sky-500 bg-sky-500 text-white",
      boxEmpty: "border-sky-500/70 bg-card",
      tone: { selected: "border-sky-500/45 bg-sky-500/12 text-sky-700 dark:text-sky-300", hover: "hover:border-sky-500/45" },
    },
    amber: {
      text: "text-amber-700 dark:text-amber-400",
      soft: "bg-amber-500/12",
      row: "border-transparent bg-amber-500/7",
      rowMissing: "border-amber-500/45 bg-amber-500/14",
      box: "border-amber-500 bg-amber-500 text-white",
      boxEmpty: "border-amber-500/70 bg-card",
      tone: { selected: "border-amber-500/45 bg-amber-500/12 text-amber-700 dark:text-amber-300", hover: "hover:border-amber-500/45" },
    },
    orange: {
      text: "text-orange-700 dark:text-orange-400",
      soft: "bg-orange-500/12",
      row: "border-transparent bg-orange-500/7",
      rowMissing: "border-orange-500/45 bg-orange-500/14",
      box: "border-orange-500 bg-orange-500 text-white",
      boxEmpty: "border-orange-500/70 bg-card",
      tone: { selected: "border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-orange-300", hover: "hover:border-orange-500/45" },
    },
    violet: {
      text: "text-violet-700 dark:text-violet-400",
      soft: "bg-violet-500/12",
      row: "border-transparent bg-violet-500/7",
      rowMissing: "border-violet-500/45 bg-violet-500/14",
      box: "border-violet-500 bg-violet-500 text-white",
      boxEmpty: "border-violet-500/70 bg-card",
      tone: { selected: "border-violet-500/45 bg-violet-500/12 text-violet-700 dark:text-violet-300", hover: "hover:border-violet-500/45" },
    },
    cyan: {
      text: "text-cyan-700 dark:text-cyan-400",
      soft: "bg-cyan-500/12",
      row: "border-transparent bg-cyan-500/7",
      rowMissing: "border-cyan-500/45 bg-cyan-500/14",
      box: "border-cyan-500 bg-cyan-500 text-white",
      boxEmpty: "border-cyan-500/70 bg-card",
      tone: { selected: "border-cyan-500/45 bg-cyan-500/12 text-cyan-700 dark:text-cyan-300", hover: "hover:border-cyan-500/45" },
    },
    pink: {
      text: "text-pink-700 dark:text-pink-400",
      soft: "bg-pink-500/12",
      row: "border-transparent bg-pink-500/7",
      rowMissing: "border-pink-500/45 bg-pink-500/14",
      box: "border-pink-500 bg-pink-500 text-white",
      boxEmpty: "border-pink-500/70 bg-card",
      tone: { selected: "border-pink-500/45 bg-pink-500/12 text-pink-700 dark:text-pink-300", hover: "hover:border-pink-500/45" },
    },
    teal: {
      text: "text-teal-700 dark:text-teal-400",
      soft: "bg-teal-500/12",
      row: "border-transparent bg-teal-500/7",
      rowMissing: "border-teal-500/45 bg-teal-500/14",
      box: "border-teal-500 bg-teal-500 text-white",
      boxEmpty: "border-teal-500/70 bg-card",
      tone: { selected: "border-teal-500/45 bg-teal-500/12 text-teal-700 dark:text-teal-300", hover: "hover:border-teal-500/45" },
    },
    yellow: {
      text: "text-yellow-700 dark:text-yellow-400",
      soft: "bg-yellow-500/15",
      row: "border-transparent bg-yellow-500/7",
      rowMissing: "border-yellow-500/45 bg-yellow-500/14",
      box: "border-yellow-500 bg-yellow-500 text-white",
      boxEmpty: "border-yellow-500/70 bg-card",
      tone: { selected: "border-yellow-500/45 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300", hover: "hover:border-yellow-500/45" },
    },
    slate: {
      text: "text-slate-600 dark:text-slate-300",
      soft: "bg-slate-500/12",
      row: "border-transparent bg-slate-500/7",
      rowMissing: "border-slate-500/45 bg-slate-500/14",
      box: "border-slate-500 bg-slate-500 text-white",
      boxEmpty: "border-slate-500/70 bg-card",
      tone: { selected: "border-slate-500/45 bg-slate-500/12 text-slate-700 dark:text-slate-200", hover: "hover:border-slate-500/45" },
    },
  }
  return palette[color]!
}

export const DEFAULT_CATEGORIES: ShoppingCategory[] = [
  {
    name: "Hortifruti",
    icon: Apple,
    ...tone("green"),
    keywords: [
      "fruta", "verdura", "legume", "banana", "maca", "laranja", "limao", "mamao", "melao", "melancia",
      "uva", "abacaxi", "manga", "morango", "pera", "kiwi", "abacate", "goiaba", "maracuja", "tomate",
      "cebola", "alho", "batata", "cenoura", "beterraba", "abobrinha", "abobora", "chuchu", "pepino",
      "pimentao", "alface", "rucula", "couve", "repolho", "brocolis", "espinafre", "agriao", "salsinha",
      "cebolinha", "coentro", "cheiro verde", "hortela", "mandioca", "aipim", "inhame", "milho verde",
      "quiabo", "berinjela", "vagem", "gengibre", "cogumelo", "champignon",
    ],
  },
  {
    name: "Açougue",
    icon: Beef,
    ...tone("red"),
    keywords: [
      "carne", "frango", "peixe", "file", "bife", "patinho", "alcatra", "picanha", "costela", "acem",
      "musculo", "coxa", "sobrecoxa", "peito de frango", "asa", "linguica", "salsicha", "bacon", "porco",
      "lombo", "pernil", "tilapia", "salmao", "sardinha fresca", "camarao", "moida", "carne moida",
      "hamburguer", "almondega", "calabresa", "ovo", "ovos",
    ],
  },
  {
    name: "Frios e laticínios",
    icon: Milk,
    ...tone("sky"),
    keywords: [
      "leite", "queijo", "mussarela", "muçarela", "presunto", "peito de peru", "mortadela", "salame",
      "iogurte", "manteiga", "margarina", "requeijao", "creme de leite", "nata", "ricota", "coalhada",
      "cream cheese", "leite condensado", "parmesao", "provolone", "danone", "petit suisse",
    ],
  },
  {
    name: "Padaria",
    icon: Croissant,
    ...tone("amber"),
    keywords: ["pao", "paes", "bisnaguinha", "torrada", "bolo", "rosca", "croissant", "sonho", "broa", "baguete"],
  },
  {
    name: "Mercearia",
    icon: Wheat,
    ...tone("orange"),
    keywords: [
      "arroz", "feijao", "macarrao", "massa", "espaguete", "lasanha", "farinha", "trigo", "fuba",
      "aveia", "acucar", "adocante", "sal", "oleo", "azeite", "vinagre", "cafe", "cha", "achocolatado",
      "molho", "extrato", "catchup", "ketchup", "maionese", "mostarda", "tempero", "pimenta", "oregano",
      "colorau", "caldo", "milho", "ervilha", "atum", "sardinha", "lentilha", "grao de bico", "granola",
      "cereal", "sucrilhos", "fermento", "gelatina", "farofa", "polvilho", "tapioca", "pipoca", "mel",
      "geleia", "pasta de amendoim", "azeitona", "palmito", "creme de milho", "amido", "maisena",
    ],
  },
  {
    name: "Doces e snacks",
    icon: Cookie,
    ...tone("pink"),
    keywords: [
      "biscoito", "bolacha", "chocolate", "bombom", "bala", "chiclete", "salgadinho", "batata palha",
      "amendoim", "doce", "sorvete de massa", "wafer", "cookie", "barra de cereal", "paçoca", "pacoca",
    ],
  },
  {
    name: "Bebidas",
    icon: CupSoda,
    ...tone("violet"),
    keywords: [
      "agua", "refrigerante", "coca", "guarana", "suco", "cerveja", "vinho", "energetico", "isotonico",
      "agua de coco", "cha gelado", "whisky", "vodka", "cachaca", "espumante",
    ],
  },
  {
    name: "Congelados",
    icon: Snowflake,
    ...tone("cyan"),
    keywords: [
      "congelado", "sorvete", "pizza", "lasanha congelada", "nuggets", "empanado", "batata frita",
      "polpa", "gelo", "pao de queijo", "acai",
    ],
  },
  {
    name: "Limpeza",
    icon: SprayCan,
    ...tone("teal"),
    keywords: [
      "detergente", "sabao", "amaciante", "desinfetante", "agua sanitaria", "candida", "alvejante",
      "esponja", "lustra", "multiuso", "limpador", "veja", "pinho", "saco de lixo", "papel toalha",
      "guardanapo", "palha de aco", "bombril", "pano", "vassoura", "rodo", "inseticida", "lava loucas",
      "tira manchas", "alcool", "papel aluminio", "papel filme", "pregador",
    ],
  },
  {
    name: "Higiene",
    icon: Bath,
    ...tone("yellow"),
    keywords: [
      "papel higienico", "sabonete", "shampoo", "xampu", "condicionador", "creme dental", "pasta de dente",
      "escova de dente", "fio dental", "desodorante", "absorvente", "algodao", "cotonete", "hastes",
      "barbeador", "aparelho de barbear", "lamina", "protetor solar", "hidratante", "enxaguante",
      "antisseptico", "curativo", "band aid", "creme", "perfume", "esmalte", "acetona",
    ],
  },
  {
    name: "Bebê",
    icon: Baby,
    ...tone("slate"),
    keywords: ["fralda", "lenco umedecido", "pomada", "papinha", "mamadeira", "chupeta", "formula infantil"],
  },
  {
    name: "Pet",
    icon: PawPrint,
    ...tone("slate"),
    keywords: ["racao", "areia", "petisco", "sache", "tapete higienico", "coleira"],
  },
]

/** Sem categoria. */
export const OTHER_CATEGORY = "Outros"

const OTHER: Omit<ShoppingCategory, "name" | "keywords"> = { icon: Package, ...tone("slate") }

const strip = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

const byKey = new Map(DEFAULT_CATEGORIES.map((category) => [strip(category.name), category]))

/** Visual da categoria (as criadas pelo usuário usam o visual de "Outros"). */
export function categoryStyle(name: string | null) {
  const found = name ? byKey.get(strip(name)) : undefined
  return found ?? { ...OTHER, name: name ?? OTHER_CATEGORY, keywords: [] }
}

/** Posição para ordenar: padrão na ordem do mercado, depois as do usuário, "Outros" no fim. */
export function categoryRank(name: string | null) {
  if (!name) return Number.MAX_SAFE_INTEGER
  const index = DEFAULT_CATEGORIES.findIndex((category) => strip(category.name) === strip(name))
  return index === -1 ? DEFAULT_CATEGORIES.length : index
}

/** Nome padrão da categoria quando o texto bate com uma padrão (ignora maiúsculas e acentos). */
export function canonicalCategory(name: string | null) {
  if (!name) return null
  return byKey.get(strip(name))?.name ?? name
}

// Palavra-chave mais longa primeiro: "leite condensado" vence "leite", "peito de peru" vence "peito".
const keywordIndex = DEFAULT_CATEGORIES.flatMap((category) =>
  category.keywords.map((keyword) => ({ keyword: strip(keyword), category: category.name }))
).sort((a, b) => b.keyword.length - a.keyword.length)

/** Sugere a categoria pelo nome do produto (ex.: "Detergente Ypê" → Limpeza). */
export function guessCategory(productName: string): string | null {
  const name = ` ${strip(productName).replace(/[^a-z0-9]+/g, " ")} `
  for (const { keyword, category } of keywordIndex) {
    // Palavra inteira, aceitando plural simples ("ovos", "bananas").
    const pattern = new RegExp(`\\s${keyword.replace(/\s+/g, "\\s")}(s|es)?\\s`)
    if (pattern.test(name)) return category
  }
  return null
}
