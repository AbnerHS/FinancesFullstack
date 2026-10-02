import { and, eq, or, sql } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type FinancialPlan, financialPlanPartners, financialPlans, type User } from "../db/schema.ts"
import { forbidden, notFound } from "../lib/errors.ts"

// Regras de acesso do FinancialPlanService (getAccessiblePlan / getOwnedPlan).

const participantCondition = (userId: string) =>
  or(
    eq(financialPlans.ownerId, userId),
    sql`exists (select 1 from ${financialPlanPartners}
                where ${financialPlanPartners.planId} = ${financialPlans.id}
                  and ${financialPlanPartners.userId} = ${userId})`,
  )

export async function getPlanOrThrow(db: Database, planId: string): Promise<FinancialPlan> {
  const plan = await db.query.financialPlans.findFirst({ where: eq(financialPlans.id, planId) })
  if (!plan) throw notFound("Plano financeiro não encontrado.")
  return plan
}

export async function isParticipant(db: Database, planId: string, userId: string): Promise<boolean> {
  const row = await db
    .select({ id: financialPlans.id })
    .from(financialPlans)
    .where(and(eq(financialPlans.id, planId), participantCondition(userId)))
    .get()
  return !!row
}

export async function requirePlanAccess(db: Database, planId: string, user: User): Promise<FinancialPlan> {
  const plan = await getPlanOrThrow(db, planId)
  if (plan.ownerId !== user.id && !(await isParticipant(db, planId, user.id))) {
    throw forbidden("Você não participa deste plano.")
  }
  return plan
}

export async function requirePlanOwner(db: Database, planId: string, user: User): Promise<FinancialPlan> {
  const plan = await getPlanOrThrow(db, planId)
  if (plan.ownerId !== user.id) {
    throw forbidden("Apenas o owner do plano pode realizar esta ação.")
  }
  return plan
}

/** Planos em que o usuário é owner ou parceiro. */
export function plansOfUser(db: Database, userId: string) {
  return db.select().from(financialPlans).where(participantCondition(userId)).orderBy(financialPlans.name)
}

export async function participantIds(db: Database, plan: FinancialPlan): Promise<string[]> {
  const partners = await db
    .select({ userId: financialPlanPartners.userId })
    .from(financialPlanPartners)
    .where(eq(financialPlanPartners.planId, plan.id))
  return [plan.ownerId, ...partners.map((p) => p.userId)]
}

/** Dois usuários participam de pelo menos um plano em comum (ou são o mesmo usuário). */
export async function sharesPlan(db: Database, userId: string, otherId: string): Promise<boolean> {
  if (userId === otherId) return true
  const row = await db
    .select({ id: financialPlans.id })
    .from(financialPlans)
    .where(and(participantCondition(userId), participantCondition(otherId)))
    .get()
  return !!row
}
