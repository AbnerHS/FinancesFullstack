import { and, eq, inArray } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type CreditCard, creditCardInvoices, creditCards, type User } from "../db/schema.ts"
import { ApiError, forbidden, notFound } from "../lib/errors.ts"
import { isForeignKeyViolation } from "../lib/db-errors.ts"
import { withLinks } from "../lib/hal.ts"
import { participantIds, plansOfUser, requirePlanAccess, sharesPlan } from "./access.ts"

// Porta do CreditCardService. Cartão pertence a um usuário; aparece nos planos de que ele participa.
// Diferente do Java, só o próprio usuário ou quem divide plano com ele acessa o cartão.

export const cardModel = (card: CreditCard) =>
  withLinks(
    { id: card.id, name: card.name, userId: card.userId },
    { self: `/api/credit-cards/${card.id}`, invoices: `/api/credit-cards/${card.id}/invoices` },
  )

export async function getAccessibleCard(db: Database, user: User, id: string): Promise<CreditCard> {
  const card = await db.query.creditCards.findFirst({ where: eq(creditCards.id, id) })
  if (!card || !(await sharesPlan(db, user.id, card.userId))) {
    throw notFound("Cartão não encontrado")
  }
  return card
}

async function assertCanAssignTo(db: Database, user: User, ownerId: string) {
  if (!(await sharesPlan(db, user.id, ownerId))) {
    throw forbidden("O dono do cartão precisa ser você ou alguém que participa de um plano com você.")
  }
}

export function listByUser(db: Database, userId: string) {
  return db.select().from(creditCards).where(eq(creditCards.userId, userId)).orderBy(creditCards.name)
}

export async function listByPlan(db: Database, user: User, planId: string) {
  const plan = await requirePlanAccess(db, planId, user)
  const ids = await participantIds(db, plan)
  return db.select().from(creditCards).where(inArray(creditCards.userId, ids)).orderBy(creditCards.name)
}

export async function create(db: Database, user: User, input: { name: string; userId: string }) {
  await assertCanAssignTo(db, user, input.userId)
  const [card] = await db
    .insert(creditCards)
    .values({ id: crypto.randomUUID(), name: input.name.trim(), userId: input.userId })
    .returning()
  return card!
}

export async function update(
  db: Database,
  user: User,
  id: string,
  input: { name?: string | undefined; userId?: string | undefined },
) {
  await getAccessibleCard(db, user, id)
  if (input.userId) await assertCanAssignTo(db, user, input.userId)
  const [card] = await db
    .update(creditCards)
    .set({
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.userId !== undefined && { userId: input.userId }),
    })
    .where(eq(creditCards.id, id))
    .returning()
  return card!
}

export async function remove(db: Database, user: User, id: string) {
  await getAccessibleCard(db, user, id)
  try {
    await db.delete(creditCards).where(eq(creditCards.id, id))
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(409, "Conflito", "O cartão possui faturas e não pode ser excluído.")
    }
    throw error
  }
}

/** Faturas do cartão, só dos planos de que o usuário participa. */
export async function invoicesOfCard(db: Database, user: User, id: string) {
  const card = await getAccessibleCard(db, user, id)
  const planIds = (await plansOfUser(db, user.id)).map((p) => p.id)
  if (planIds.length === 0) return { card, invoices: [] }
  const invoices = await db
    .select()
    .from(creditCardInvoices)
    .where(and(eq(creditCardInvoices.creditCardId, card.id), inArray(creditCardInvoices.planId, planIds)))
    .orderBy(creditCardInvoices.referenceMonth)
  return { card, invoices }
}
