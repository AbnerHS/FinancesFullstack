import { z } from "zod"
import { isIsoDate, isYearMonth, monthBounds } from "./dates.ts"
import { badRequest } from "./errors.ts"

export const isoDate = z.string().refine(isIsoDate, "Data inválida (use AAAA-MM-DD)")
export const yearMonth = z.string().refine(isYearMonth, "Mês inválido (use AAAA-MM)")
// Aceita qualquer UUID (os IDs vindos do MySQL nem sempre são v4).
export const id = (message = "Identificador inválido") => z.guid(message)

export type DateRange = { from: string; to: string }

/**
 * Intervalo de datas a partir da query string: `month=AAAA-MM` ou `from`/`to` (AAAA-MM-DD).
 * Sem nenhum dos dois, devolve null (sem filtro).
 */
export function parseDateRange(query: Record<string, string | undefined>): DateRange | null {
  const { month, from, to } = query
  if (month) {
    if (!isYearMonth(month)) throw badRequest("Parâmetro 'month' inválido (use AAAA-MM)")
    return monthBounds(month)
  }
  if (!from && !to) return null
  if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
    throw badRequest("Informe 'from' e 'to' no formato AAAA-MM-DD")
  }
  if (from > to) throw badRequest("'from' deve ser anterior ou igual a 'to'")
  return { from, to }
}
