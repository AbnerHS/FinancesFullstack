import { eq, inArray, isNotNull, and } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { type Transaction, transactions, type User } from "../db/schema.ts"
import { ApiError, badRequest, notFound } from "../lib/errors.ts"
import { cleanupUnusedDocuments } from "./documents.ts"
import { assertCanAttachDocument, findModel, getAccessibleTransaction } from "./transactions.ts"

// Porta do LocalBillingDocumentStorageService + endpoints de documento do TransactionService,
// com os arquivos no R2 (binding DOCS) em vez do disco da VPS.

export type DocumentScope = "SINGLE" | "GROUP"

type Ctx = { env: Env; db: Database; user: User }

// O tipo servido vem só da extensão: o Content-Type enviado pelo navegador é ignorado, para um
// HTML renomeado nunca ser servido como text/html na mesma origem do app.
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export const maxFileSize = (env: Env) => Number(env.TRANSACTION_DOCUMENTS_MAX_FILE_SIZE)

const formatSize = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`

function sanitizeFileName(name: string | undefined): string {
  // Só o nome final (sem diretórios) e sem quebras de linha, como no Java.
  const base = (name ?? "").split(/[\\/]/).pop()?.trim().replace(/[\r\n]/g, "_")
  return base || "documento"
}

function extensionOf(fileName: string): string {
  const index = fileName.lastIndexOf(".")
  if (index < 0 || index === fileName.length - 1) throw badRequest("Tipo de arquivo não suportado.")
  return fileName.slice(index + 1).toLowerCase()
}

/** Mesmo formato de chave do Java (AAAA/MM/uuid.ext), para os arquivos migrados manterem a chave. */
function storageKey(extension: string): string {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}.${extension}`
}

async function targetTransactions(db: Database, anchor: Transaction, scope: DocumentScope) {
  if (scope !== "GROUP" || !anchor.recurringGroupId) return [anchor]
  const group = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.recurringGroupId, anchor.recurringGroupId), eq(transactions.planId, anchor.planId)))
  return group.length > 0 ? group : [anchor]
}

function updateAll(db: Database, ids: string[], values: Partial<Transaction>) {
  return db.update(transactions).set(values).where(inArray(transactions.id, ids))
}

export async function upload(ctx: Ctx, id: string, file: File | null, scope: DocumentScope) {
  const anchor = await getAccessibleTransaction(ctx.db, ctx.user, id)

  if (!file || file.size === 0) throw badRequest("Selecione um arquivo para envio.")
  if (file.size > maxFileSize(ctx.env)) {
    throw badRequest(`O arquivo deve ter no máximo ${formatSize(maxFileSize(ctx.env))}.`)
  }
  const fileName = sanitizeFileName(file.name)
  const extension = extensionOf(fileName)
  const mimeType = MIME_BY_EXTENSION[extension]
  if (!mimeType) throw badRequest("Tipo de arquivo não suportado.")

  const targets = await targetTransactions(ctx.db, anchor, scope)
  for (const target of targets) {
    assertCanAttachDocument(!!target.billingDocumentType, target.dueDate)
  }

  const key = storageKey(extension)
  await ctx.env.DOCS.put(key, file.stream(), {
    httpMetadata: { contentType: mimeType },
    customMetadata: { fileName },
  })

  try {
    await updateAll(
      ctx.db,
      targets.map((t) => t.id),
      {
        billingDocumentType: "FILE",
        billingDocumentUrl: null,
        billingDocumentStorageKey: key,
        billingDocumentFileName: fileName,
        billingDocumentMimeType: mimeType,
        billingDocumentUploadedAt: new Date().toISOString(),
      },
    )
  } catch (error) {
    // Se o banco falhar, não deixa o arquivo órfão no R2.
    await ctx.env.DOCS.delete(key)
    throw error
  }

  await cleanupUnusedDocuments(
    ctx.env,
    ctx.db,
    targets.map((t) => t.billingDocumentStorageKey),
  )
  return findModel(ctx.db, anchor.id)
}

export async function remove(ctx: Ctx, id: string, scope: DocumentScope) {
  const anchor = await getAccessibleTransaction(ctx.db, ctx.user, id)
  const targets = await targetTransactions(ctx.db, anchor, scope)

  await updateAll(
    ctx.db,
    targets.map((t) => t.id),
    {
      billingDocumentType: null,
      billingDocumentUrl: null,
      billingDocumentStorageKey: null,
      billingDocumentFileName: null,
      billingDocumentMimeType: null,
      billingDocumentUploadedAt: null,
    },
  )
  await cleanupUnusedDocuments(
    ctx.env,
    ctx.db,
    targets.map((t) => t.billingDocumentStorageKey),
  )
  return findModel(ctx.db, anchor.id)
}

/** RFC 6266: `filename` ASCII de fallback + `filename*` UTF-8 para acentos. */
function contentDisposition(fileName: string): string {
  const ascii = fileName.normalize("NFKD").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export async function download(ctx: Ctx, id: string): Promise<Response> {
  const transaction = await getAccessibleTransaction(ctx.db, ctx.user, id)
  const key = transaction.billingDocumentStorageKey
  if (transaction.billingDocumentType !== "FILE" || !key) {
    throw notFound("Documento para pagamento não encontrado.")
  }

  const object = await ctx.env.DOCS.get(key)
  if (!object) {
    throw new ApiError(404, "Recurso não encontrado", "Arquivo do documento não encontrado no armazenamento.")
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": transaction.billingDocumentMimeType || "application/octet-stream",
      "Content-Length": String(object.size),
      "Content-Disposition": contentDisposition(transaction.billingDocumentFileName || "documento"),
      "X-Content-Type-Options": "nosniff",
      // Mesmo que alguém abra a URL direto, o conteúdo não roda script na origem do app.
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  })
}

/** Chaves de arquivos das transações do plano (para limpar o R2 depois de excluir o plano). */
export async function storageKeysOfPlan(db: Database, planId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ key: transactions.billingDocumentStorageKey })
    .from(transactions)
    .where(and(eq(transactions.planId, planId), isNotNull(transactions.billingDocumentStorageKey)))
  return rows.flatMap((r) => (r.key ? [r.key] : []))
}
