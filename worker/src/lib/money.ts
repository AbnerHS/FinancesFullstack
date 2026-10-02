// Valores monetários são guardados em centavos (inteiro) porque o SQLite não tem decimal exato.
// A API continua expondo números decimais (ex.: 12.34), como o backend Java.

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Valor monetário inválido: ${amount}`)
  }
  // toPrecision(15) descarta o ruído de ponto flutuante (1.005 * 100 = 100.49999999999999).
  // Arredonda metade para longe do zero, simétrico para valores negativos.
  const scaled = Number((amount * 100).toPrecision(15))
  return Math.sign(scaled) * Math.round(Math.abs(scaled)) || 0
}

export function fromCents(cents: number): number
export function fromCents(cents: number | null): number | null
export function fromCents(cents: number | null): number | null {
  return cents === null ? null : cents / 100
}
