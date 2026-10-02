import { count, eq } from "drizzle-orm"
import type { Database } from "../db/client.ts"
import { transactions } from "../db/schema.ts"

// Um mesmo arquivo pode estar em várias transações (upload com scope GROUP). Só apaga do R2
// quando nenhuma transação aponta mais para a chave (cleanupStorageKeyIfUnused do Java).
export async function cleanupUnusedDocuments(env: Env, db: Database, storageKeys: Iterable<string | null>) {
  for (const key of new Set(storageKeys)) {
    if (!key) continue
    const [row] = await db
      .select({ n: count() })
      .from(transactions)
      .where(eq(transactions.billingDocumentStorageKey, key))
    if (row?.n === 0) {
      await env.DOCS.delete(key)
    }
  }
}
