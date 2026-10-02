import { asc, eq, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type TransactionCategory, transactionCategories } from "../db/schema.ts"
import { badRequest, notFound } from "../lib/errors.ts"
import { isUniqueViolation } from "../lib/db-errors.ts"
import { withLinks } from "../lib/hal.ts"

// Porta do TransactionCategoryService. Categorias são globais (compartilhadas entre usuários),
// como no backend Java.

export const categoryModel = (category: TransactionCategory) =>
  withLinks(
    { id: category.id, name: category.name },
    { self: `/api/transaction-categories/${category.id}`, categories: "/api/transaction-categories" },
  )

const byNameIgnoreCase = (name: string) => sql`lower(${transactionCategories.name}) = lower(${name})`

function normalizeName(name: string | null | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) throw badRequest("O nome da categoria é obrigatório")
  return trimmed
}

const duplicate = () => badRequest("Já existe uma categoria com este nome")

export function list(db: Database) {
  return db.select().from(transactionCategories).orderBy(asc(transactionCategories.name))
}

export async function findById(db: Database, id: string) {
  const category = await db.query.transactionCategories.findFirst({ where: eq(transactionCategories.id, id) })
  if (!category) throw notFound("Categoria de transação não encontrada")
  return category
}

export async function create(db: Database, name: string) {
  try {
    const [category] = await db
      .insert(transactionCategories)
      .values({ id: crypto.randomUUID(), name: normalizeName(name) })
      .returning()
    return category!
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

export async function rename(db: Database, id: string, name: string) {
  await findById(db, id)
  try {
    const [category] = await db
      .update(transactionCategories)
      .set({ name: normalizeName(name) })
      .where(eq(transactionCategories.id, id))
      .returning()
    return category!
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate()
    throw error
  }
}

export async function remove(db: Database, id: string) {
  const deleted = await db.delete(transactionCategories).where(eq(transactionCategories.id, id)).returning()
  if (deleted.length === 0) throw notFound("Categoria de transação não encontrada para exclusão")
}

/**
 * Resolve a categoria informada na transação: por id, ou por nome (criando se não existir),
 * como o resolveCategory do Java. `undefined`/vazio → sem categoria.
 */
export async function resolve(
  db: Database,
  input: { id?: string | null; name?: string | null } | null | undefined,
): Promise<string | null> {
  if (!input) return null
  if (input.id) return (await findById(db, input.id)).id

  const name = input.name?.trim()
  if (!name) return null

  // INSERT OR IGNORE + SELECT evita corrida entre duas requisições criando o mesmo nome.
  await db.insert(transactionCategories).values({ id: crypto.randomUUID(), name }).onConflictDoNothing()
  const category = await db.select().from(transactionCategories).where(byNameIgnoreCase(name)).get()
  return category!.id
}
