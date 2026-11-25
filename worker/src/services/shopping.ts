import { and, asc, eq, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type ShoppingItem, shoppingItems, type User } from "../db/schema.ts"
import { isUniqueViolation } from "../lib/db-errors.ts"
import { ApiError, notFound } from "../lib/errors.ts"
import { withLinks } from "../lib/hal.ts"
import { requirePlanAccess } from "./access.ts"

// Lista de compras compartilhada do plano. Os produtos de sempre ficam cadastrados e marcados
// (tem em casa); antes do mercado desmarca-se o que falta e, nas compras, marca-se o que entrou no
// carrinho. Marcar grava o valor (não inverte), então dois celulares marcando juntos não brigam.

export type ShoppingItemInput = {
  name?: string
  category?: string | null
  checked?: boolean
  note?: string | null
}

const clean = (value: string | null | undefined) => {
  const trimmed = value?.replace(/\s+/g, " ").trim()
  return trimmed ? trimmed : null
}

function itemModel(item: ShoppingItem) {
  return withLinks(
    {
      id: item.id,
      planId: item.planId,
      name: item.name,
      category: item.category,
      checked: item.checked,
      note: item.note,
      updatedAt: item.updatedAt,
      updatedBy: item.updatedBy,
    },
    { self: `/api/shopping-items/${item.id}`, plan: `/api/plans/${item.planId}` },
  )
}

export async function list(db: Database, user: User, planId: string) {
  await requirePlanAccess(db, planId, user)
  const rows = await db
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.planId, planId))
    .orderBy(asc(sql`lower(${shoppingItems.name})`))
  return rows.map(itemModel)
}

/**
 * Cadastra vários produtos de uma vez (colar a lista antiga, um por linha). Nomes repetidos — na
 * lista enviada ou já cadastrados — são ignorados e devolvidos em `skipped`.
 */
export async function createMany(
  db: Database,
  user: User,
  planId: string,
  items: Array<ShoppingItemInput & { name: string }>,
) {
  await requirePlanAccess(db, planId, user)
  const now = new Date().toISOString()
  const seen = new Set<string>()
  const skipped: string[] = []
  const values: ShoppingItem[] = []
  for (const input of items) {
    const name = clean(input.name)
    if (!name) continue
    const key = name.toLocaleLowerCase("pt-BR")
    if (seen.has(key)) {
      skipped.push(name)
      continue
    }
    seen.add(key)
    const checked = input.checked ?? true
    values.push({
      id: crypto.randomUUID(),
      planId,
      name,
      category: clean(input.category),
      checked,
      note: checked ? null : clean(input.note),
      createdAt: now,
      updatedAt: now,
      updatedBy: user.id,
    })
  }
  if (values.length === 0) return { created: [], skipped }

  // Um insert por produto: o D1 limita os parâmetros por consulta.
  const [first, ...rest] = values.map((value) =>
    db.insert(shoppingItems).values(value).onConflictDoNothing().returning(),
  )
  const results = await db.batch([first!, ...rest])
  const created = results.flat()
  const createdIds = new Set(created.map((row) => row.id))
  for (const value of values) if (!createdIds.has(value.id)) skipped.push(value.name)
  return { created: created.map(itemModel), skipped }
}

async function getAccessible(db: Database, user: User, id: string) {
  const item = await db.query.shoppingItems.findFirst({ where: eq(shoppingItems.id, id) })
  if (!item) throw notFound("Produto não encontrado")
  await requirePlanAccess(db, item.planId, user)
  return item
}

export async function update(db: Database, user: User, id: string, input: ShoppingItemInput) {
  const current = await getAccessible(db, user, id)
  const has = (key: keyof ShoppingItemInput) => Object.prototype.hasOwnProperty.call(input, key)
  const next = { ...current, updatedAt: new Date().toISOString(), updatedBy: user.id }
  if (has("name")) next.name = clean(input.name) ?? current.name
  if (has("category")) next.category = clean(input.category)
  if (has("checked")) next.checked = input.checked!
  if (has("note")) next.note = clean(input.note)
  // Comprado (ou tem em casa): a observação do que faltava não vale mais.
  if (next.checked) next.note = null

  const { id: _id, planId: _planId, createdAt: _createdAt, ...fields } = next
  try {
    const [row] = await db.update(shoppingItems).set(fields).where(eq(shoppingItems.id, id)).returning()
    return itemModel(row!)
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError(409, "Conflito", "Já existe um produto com esse nome na lista.")
    throw error
  }
}

/** Marca (ou desmarca) todos os produtos: fim das compras, ou recomeçar a lista. */
export async function setAll(db: Database, user: User, planId: string, checked: boolean) {
  await requirePlanAccess(db, planId, user)
  await db
    .update(shoppingItems)
    .set({ checked, updatedAt: new Date().toISOString(), updatedBy: user.id, ...(checked ? { note: null } : {}) })
    .where(and(eq(shoppingItems.planId, planId), sql`${shoppingItems.checked} <> ${checked ? 1 : 0}`))
  return list(db, user, planId)
}

export async function remove(db: Database, user: User, id: string) {
  await getAccessible(db, user, id)
  await db.delete(shoppingItems).where(eq(shoppingItems.id, id))
}
