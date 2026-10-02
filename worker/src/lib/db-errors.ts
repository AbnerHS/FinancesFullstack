// O D1 (via Drizzle) devolve erros de constraint como texto; o detalhe pode estar em `cause`.

function messages(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  while (current instanceof Error && parts.length < 5) {
    parts.push(current.message)
    current = current.cause
  }
  return parts.join(" | ")
}

export const isUniqueViolation = (error: unknown) => messages(error).includes("UNIQUE constraint failed")
export const isForeignKeyViolation = (error: unknown) =>
  messages(error).includes("FOREIGN KEY constraint failed")
