// Datas de competência (`YYYY-MM-DD`) e meses de referência (`YYYY-MM`), sem fuso horário.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_RE = /^(\d{4})-(\d{2})$/

export function isIsoDate(value: string): boolean {
  const match = DATE_RE.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m)
}

export function isYearMonth(value: string): boolean {
  const match = MONTH_RE.exec(value)
  return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 12
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const pad = (n: number, size = 2) => String(n).padStart(size, "0")

export function toYearMonth(date: string): string {
  return date.slice(0, 7)
}

/** Primeiro e último dia do mês, para filtros `BETWEEN`. */
export function monthBounds(yearMonth: string): { from: string; to: string } {
  const [y, m] = yearMonth.split("-").map(Number) as [number, number]
  return { from: `${yearMonth}-01`, to: `${yearMonth}-${pad(daysInMonth(y, m))}` }
}

/** Soma meses mantendo o dia, limitado ao fim do mês (31/01 + 1 → 28/02). Equivale ao shiftToPeriod do Java. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const total = y * 12 + (m - 1) + months
  const year = Math.floor(total / 12)
  const month = (total % 12) + 1
  return `${pad(year, 4)}-${pad(month)}-${pad(Math.min(d, daysInMonth(year, month)))}`
}

/** Move a data para o mês informado mantendo o dia (limitado ao fim do mês). Usado ao vincular à fatura. */
export function moveToMonth(date: string, yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number) as [number, number]
  const d = Number(date.slice(8, 10))
  return `${yearMonth}-${pad(Math.min(d, daysInMonth(y, m)))}`
}

/** Quantos meses de `from` a `to`, inclusive (AAAA-MM). */
export function monthsBetween(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number) as [number, number]
  const [ty, tm] = to.split("-").map(Number) as [number, number]
  return (ty - fy) * 12 + (tm - fm) + 1
}

/** Lista AAAA-MM de `from` a `to`, inclusive. */
export function monthRange(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number) as [number, number]
  return Array.from({ length: Math.max(monthsBetween(from, to), 0) }, (_, index) => {
    const date = new Date(Date.UTC(fy, fm - 1 + index, 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
  })
}

/** Soma meses a um AAAA-MM. */
export function addMonthsToYearMonth(yearMonth: string, months: number) {
  return addMonths(`${yearMonth}-01`, months).slice(0, 7)
}

/** Dia `day` do mês, limitado ao último dia (31 em fevereiro → 28/29). */
export function dayOfMonth(yearMonth: string, day: number) {
  const [y, m] = yearMonth.split("-").map(Number) as [number, number]
  return `${yearMonth}-${pad(Math.min(day, daysInMonth(y, m)))}`
}

/** Mês atual no fuso do app (America/Sao_Paulo), AAAA-MM. */
export function currentYearMonth(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .format(now)
    .slice(0, 7)
}
