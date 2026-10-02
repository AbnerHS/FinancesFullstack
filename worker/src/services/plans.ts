import { and, eq, inArray } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type FinancialPlan, financialPlanPartners, financialPlans, type User, users } from "../db/schema.ts"
import { badRequest, notFound } from "../lib/errors.ts"
import { withLinks } from "../lib/hal.ts"
import { participantIds, plansOfUser, requirePlanAccess, requirePlanOwner } from "./access.ts"

// Porta do FinancialPlanService.

export async function planModel(db: Database, plan: FinancialPlan) {
  const ids = await participantIds(db, plan)
  return toPlanModel(plan, ids.slice(1))
}

function toPlanModel(plan: FinancialPlan, partnerIds: string[]) {
  const base = `/api/plans/${plan.id}`
  return withLinks(
    { id: plan.id, name: plan.name, ownerId: plan.ownerId, partnerIds },
    {
      self: base,
      participants: `${base}/participants`,
      transactions: `${base}/transactions`,
      invoices: `${base}/invoices`,
      months: `${base}/months`,
      summary: `${base}/summary`,
      "credit-cards": `${base}/credit-cards`,
      owner: `/api/users/${plan.ownerId}`,
    },
  )
}

export async function listForUser(db: Database, user: User) {
  const plans = await plansOfUser(db, user.id)
  if (plans.length === 0) return []

  const partners = await db
    .select()
    .from(financialPlanPartners)
    .where(
      inArray(
        financialPlanPartners.planId,
        plans.map((p) => p.id),
      ),
    )
  return plans.map((plan) =>
    toPlanModel(
      plan,
      partners.filter((p) => p.planId === plan.id).map((p) => p.userId),
    ),
  )
}

export async function create(db: Database, user: User, name: string) {
  const [plan] = await db
    .insert(financialPlans)
    .values({ id: crypto.randomUUID(), name: name.trim(), ownerId: user.id })
    .returning()
  return plan!
}

export async function rename(db: Database, user: User, planId: string, name: string) {
  await requirePlanOwner(db, planId, user)
  const trimmed = name.trim()
  if (!trimmed) throw badRequest("O nome do plano é obrigatório.")
  const [plan] = await db.update(financialPlans).set({ name: trimmed }).where(eq(financialPlans.id, planId)).returning()
  return plan!
}

// TODO(documentos): apagar do R2 os comprovantes das transações removidas.
export async function remove(db: Database, user: User, planId: string) {
  await requirePlanOwner(db, planId, user)
  // Transações, faturas e parceiros saem por ON DELETE CASCADE.
  await db.delete(financialPlans).where(eq(financialPlans.id, planId))
}

export async function participants(db: Database, user: User, planId: string) {
  const plan = await requirePlanAccess(db, planId, user)
  const ids = await participantIds(db, plan)
  const rows = await db.select().from(users).where(inArray(users.id, ids))
  const byId = new Map(rows.map((u) => [u.id, u]))
  return ids.flatMap((id, index) => {
    const participant = byId.get(id)
    return participant
      ? [{ userId: id, name: participant.name, email: participant.email, role: index === 0 ? "OWNER" : "PARTNER" }]
      : []
  })
}

const inviteLink = (plan: FinancialPlan) => ({
  planId: plan.id,
  planName: plan.name,
  inviteToken: plan.activeInviteToken || null,
  active: !!plan.activeInviteToken,
})

// 128 bits aleatórios em hex, como o UUID sem hífens do Java.
const newInviteToken = () => crypto.randomUUID().replaceAll("-", "")

export async function getInviteLink(db: Database, user: User, planId: string) {
  return inviteLink(await requirePlanOwner(db, planId, user))
}

export async function rotateInviteLink(db: Database, user: User, planId: string) {
  await requirePlanOwner(db, planId, user)
  const [plan] = await db
    .update(financialPlans)
    .set({ activeInviteToken: newInviteToken() })
    .where(eq(financialPlans.id, planId))
    .returning()
  return inviteLink(plan!)
}

export async function revokeInviteLink(db: Database, user: User, planId: string) {
  await requirePlanOwner(db, planId, user)
  await db.update(financialPlans).set({ activeInviteToken: null }).where(eq(financialPlans.id, planId))
}

async function findByInviteToken(db: Database, token: string) {
  const trimmed = token.trim()
  const plan = trimmed
    ? await db.query.financialPlans.findFirst({ where: eq(financialPlans.activeInviteToken, trimmed) })
    : undefined
  if (!plan) throw notFound("Convite não encontrado.")
  return plan
}

async function invitation(db: Database, plan: FinancialPlan, user: User) {
  const owner = await db.query.users.findFirst({ where: eq(users.id, plan.ownerId) })
  const isOwner = plan.ownerId === user.id
  const ids = await participantIds(db, plan)
  return {
    planId: plan.id,
    planName: plan.name,
    ownerId: plan.ownerId,
    ownerName: owner?.name ?? null,
    ownerEmail: owner?.email ?? null,
    alreadyParticipant: ids.includes(user.id),
    owner: isOwner,
  }
}

export async function resolveInvitation(db: Database, user: User, token: string) {
  return invitation(db, await findByInviteToken(db, token), user)
}

export async function acceptInvitation(db: Database, user: User, token: string) {
  const plan = await findByInviteToken(db, token)
  if (plan.ownerId !== user.id) {
    await db.insert(financialPlanPartners).values({ planId: plan.id, userId: user.id }).onConflictDoNothing()
  }
  return invitation(db, plan, user)
}

export async function removeParticipant(db: Database, user: User, planId: string, userId: string) {
  const plan = await requirePlanOwner(db, planId, user)
  if (plan.ownerId === userId) {
    throw badRequest("O owner não pode ser removido do plano.")
  }
  const removed = await db
    .delete(financialPlanPartners)
    .where(and(eq(financialPlanPartners.planId, planId), eq(financialPlanPartners.userId, userId)))
    .returning()
  if (removed.length === 0) {
    throw notFound("Parceiro não encontrado no plano.")
  }
  // Como no Java: o link antigo para de valer, para quem saiu não voltar sozinho.
  await db.update(financialPlans).set({ activeInviteToken: newInviteToken() }).where(eq(financialPlans.id, planId))
}
