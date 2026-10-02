// Converte os dados do MySQL (backend Java) para o schema D1 do Worker.
//
//   export: lê o MySQL e gera, em --out:
//     - d1-import.sql          INSERTs na ordem das FKs, para `wrangler d1 execute --file`
//     - expected.json          contagens e somas esperadas, usadas pelo `verify`
//     - upload-documents.sh    copia os comprovantes da VPS para o R2, com as mesmas chaves
//   verify: consulta o D1 via wrangler e compara com expected.json.
//
// Uso:
//   MYSQL_URL=mysql://user:senha@127.0.0.1:3306/finances \
//     node scripts/migrate-from-mysql.ts export --out migration [--documents-dir ./payment-documents]
//   node scripts/migrate-from-mysql.ts verify --dir migration (--local | --remote)
//
// Nada é gravado se houver inconsistência que exija decisão humana: o script lista os registros
// e sai com código 1.

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import mysql from "mysql2/promise"
import { toYearMonth } from "../src/lib/dates.ts"

// ---------------------------------------------------------------------------------------------
// Tipos das linhas lidas do MySQL (UUIDs já convertidos com BIN_TO_UUID, datas como texto)

type UserRow = {
  id: string
  email: string
  password: string
  name: string | null
  auth_provider: string
  google_subject: string | null
  email_verified: number
}
type PlanRow = { id: string; owner_id: string; name: string | null; active_invite_token: string | null }
type PartnerRow = { plan_id: string; user_id: string }
type CategoryRow = { id: string; name: string }
type CardRow = { id: string; user_id: string; name: string | null }
type PeriodRow = { id: string; plan_id: string | null; month: number; year: number; monthly_balance: string | null }
type InvoiceRow = { id: string; credit_card_id: string; period_id: string; amount_cents: number | null }
type TransactionRow = {
  id: string
  amount_cents: number | null
  datetime: string | null
  period_id: string | null
  responsible_user_id: string | null
  recurring_group_id: string | null
  description: string | null
  type: string | null
  credit_card_invoice_id: string | null
  is_cleared_by_invoice: number
  display_order: number | null
  category_id: string | null
  due_date: string | null
  payment_date: string | null
  payment_status: string
  billing_document_type: string | null
  billing_document_url: string | null
  billing_document_file_name: string | null
  billing_document_mime_type: string | null
  billing_document_storage_key: string | null
  billing_document_uploaded_at: string | null
}

type Expected = {
  generatedAt: string
  counts: Record<string, number>
  planTotals: Record<string, { revenueCents: number; expenseCents: number; transactions: number }>
  documentKeys: number
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

// Posição de display_order na linha de INSERT de transactions (ver colunas em convert).
const DISPLAY_ORDER_INDEX = 10

const STORAGE_KEY_RE = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]+$/

// ---------------------------------------------------------------------------------------------
// Utilitários

/** 'YYYY-MM-DD HH:MM:SS[.ffffff]' (MySQL, UTC) → ISO-8601 com milissegundos e 'Z'. */
export function toIsoInstant(value: string | null): string | null {
  if (!value) return null
  const [date, time = "00:00:00"] = value.split(" ")
  const [hms, fraction = ""] = time.split(".")
  return `${date}T${hms}.${fraction.padEnd(3, "0").slice(0, 3)}Z`
}

const monthOf = (year: number, month: number) => `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`

/**
 * Data de competência dentro de `month`: o vencimento se cair no mês, senão a data de criação
 * se cair no mês, senão o dia 1º. Garante que nenhuma transação muda de mês.
 */
export function referenceDateFor(month: string, dueDate: string | null, createdAt: string | null): string {
  for (const candidate of [dueDate, createdAt?.slice(0, 10) ?? null]) {
    if (candidate && toYearMonth(candidate) === month) return candidate
  }
  return `${month}-01`
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error(`Número não inteiro/seguro no export: ${value}`)
    return String(value)
  }
  if (typeof value === "boolean") return value ? "1" : "0"
  return `'${String(value).replaceAll("'", "''")}'`
}

/** INSERTs com várias linhas, em lotes (o D1 limita o tamanho de cada statement). */
function inserts(table: string, columns: string[], rows: unknown[][], batchSize = 50): string[] {
  const statements: string[] = []
  for (let i = 0; i < rows.length; i += batchSize) {
    const values = rows
      .slice(i, i + batchSize)
      .map((row) => `(${row.map(sqlValue).join(", ")})`)
      .join(",\n  ")
    statements.push(`INSERT INTO ${table} (${columns.join(", ")}) VALUES\n  ${values};`)
  }
  return statements
}

const shellQuote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`

// ---------------------------------------------------------------------------------------------
// Export

async function readAll(url: string) {
  const connection = await mysql.createConnection({ uri: url, dateStrings: true, supportBigNumbers: true })
  const q = async <T>(sql: string) => (await connection.query(sql))[0] as T[]
  try {
    return {
      users: await q<UserRow>(
        `select bin_to_uuid(id) id, email, password, name, auth_provider, google_subject, email_verified from users`,
      ),
      plans: await q<PlanRow>(
        `select bin_to_uuid(id) id, bin_to_uuid(owner_id) owner_id, name, active_invite_token from financial_plans`,
      ),
      partners: await q<PartnerRow>(
        `select bin_to_uuid(plan_id) plan_id, bin_to_uuid(user_id) user_id from financial_plan_partners`,
      ),
      categories: await q<CategoryRow>(`select bin_to_uuid(id) id, name from transaction_categories`),
      cards: await q<CardRow>(`select bin_to_uuid(id) id, bin_to_uuid(user_id) user_id, name from credit_cards`),
      periods: await q<PeriodRow>(
        `select bin_to_uuid(id) id, bin_to_uuid(financial_plan_id) plan_id, month, year, monthly_balance
           from financial_periods`,
      ),
      // ROUND em DECIMAL é exato e arredonda metade para longe do zero.
      invoices: await q<InvoiceRow>(
        `select bin_to_uuid(id) id, bin_to_uuid(credit_card_id) credit_card_id, bin_to_uuid(period_id) period_id,
                cast(round(amount * 100) as signed) amount_cents
           from credit_card_invoices`,
      ),
      transactions: await q<TransactionRow>(
        `select bin_to_uuid(id) id, cast(round(amount * 100) as signed) amount_cents, datetime,
                bin_to_uuid(period_id) period_id, bin_to_uuid(responsible_user_id) responsible_user_id,
                bin_to_uuid(recurring_group_id) recurring_group_id, description, type,
                bin_to_uuid(credit_card_invoice_id) credit_card_invoice_id, is_cleared_by_invoice, display_order,
                bin_to_uuid(category_id) category_id, due_date, payment_date, payment_status,
                billing_document_type, billing_document_url, billing_document_file_name,
                billing_document_mime_type, billing_document_storage_key, billing_document_uploaded_at
           from transactions`,
      ),
    }
  } finally {
    await connection.end()
  }
}

type Data = Awaited<ReturnType<typeof readAll>>

export function convert(data: Data) {
  const errors: string[] = []
  const warnings: string[] = []

  // Usuários: e-mail normalizado. Colisões (Ana@x / ana@x) precisam de decisão humana.
  const byEmail = new Map<string, string[]>()
  for (const u of data.users) {
    const email = u.email.trim().toLowerCase()
    byEmail.set(email, [...(byEmail.get(email) ?? []), u.id])
  }
  for (const [email, ids] of byEmail) {
    if (ids.length > 1) errors.push(`E-mail duplicado após normalizar (minúsculas, sem espaços nas pontas): ${email} (usuários ${ids.join(", ")})`)
  }

  const periods = new Map(data.periods.map((p) => [p.id, p]))
  const periodMonth = (p: PeriodRow) => monthOf(p.year, p.month)

  for (const p of data.periods) {
    if (p.monthly_balance !== null && Number(p.monthly_balance) !== 0) {
      warnings.push(`Período ${periodMonth(p)} (${p.id}) tinha monthly_balance=${p.monthly_balance}; o campo deixa de existir.`)
    }
  }

  // Faturas: período → plano + mês.
  const invoices = new Map<string, { row: InvoiceRow; planId: string; month: string }>()
  const invoiceKeys = new Map<string, string[]>()
  for (const inv of data.invoices) {
    const period = periods.get(inv.period_id)
    if (!period?.plan_id) {
      errors.push(`Fatura ${inv.id} aponta para período inexistente ou sem plano (${inv.period_id}).`)
      continue
    }
    const month = periodMonth(period)
    invoices.set(inv.id, { row: inv, planId: period.plan_id, month })
    const key = `${period.plan_id}|${inv.credit_card_id}|${month}`
    invoiceKeys.set(key, [...(invoiceKeys.get(key) ?? []), inv.id])
  }
  for (const [key, ids] of invoiceKeys) {
    if (ids.length > 1) {
      const [planId, cardId, month] = key.split("|")
      errors.push(`Mais de uma fatura do cartão ${cardId} em ${month} no plano ${planId}: ${ids.join(", ")}`)
    }
  }

  // Transações: período → plano + data de competência.
  const transactions: unknown[][] = []
  const planTotals: Expected["planTotals"] = {}
  const documentKeys = new Map<string, string>() // chave → mime
  const movedRows: { row: unknown[]; monthKey: string; order: number }[] = []
  const maxOrderByMonth = new Map<string, number>()
  let movedToInvoiceMonth = 0

  for (const t of data.transactions) {
    const period = t.period_id ? periods.get(t.period_id) : undefined
    if (!period?.plan_id) {
      errors.push(`Transação ${t.id} sem período/plano (period_id=${t.period_id}).`)
      continue
    }
    if (t.amount_cents === null || (t.type !== "REVENUE" && t.type !== "EXPENSE")) {
      errors.push(`Transação ${t.id} sem valor ou com tipo inválido (amount=${t.amount_cents}, type=${t.type}).`)
      continue
    }

    let month = periodMonth(period)
    if (t.credit_card_invoice_id) {
      const invoice = invoices.get(t.credit_card_invoice_id)
      if (!invoice) {
        errors.push(`Transação ${t.id} aponta para fatura inexistente ${t.credit_card_invoice_id}.`)
        continue
      }
      if (invoice.planId !== period.plan_id) {
        errors.push(`Transação ${t.id} (plano ${period.plan_id}) vinculada a fatura de outro plano (${invoice.planId}).`)
        continue
      }
      // Decisão: transação de fatura segue o mês da fatura.
      if (invoice.month !== month) {
        movedToInvoiceMonth++
        month = invoice.month
      }
    }

    const createdAt = toIsoInstant(t.datetime) ?? `${monthOf(period.year, period.month)}-01T00:00:00.000Z`
    const referenceDate = referenceDateFor(month, t.due_date, t.datetime)

    // Tipo do arquivo pela extensão, como o Worker faz no upload (o Java guardava o do navegador).
    let mimeType = t.billing_document_mime_type
    const storageKey = t.billing_document_storage_key || null
    if (t.billing_document_type === "FILE" && storageKey) {
      const extension = storageKey.split(".").pop()?.toLowerCase() ?? ""
      mimeType = MIME_BY_EXTENSION[extension] ?? null
      if (!mimeType) {
        errors.push(`Transação ${t.id}: comprovante com extensão não suportada (${storageKey}).`)
        continue
      }
      if (!STORAGE_KEY_RE.test(storageKey)) {
        errors.push(`Transação ${t.id}: chave de comprovante fora do padrão AAAA/MM/uuid.ext (${storageKey}).`)
        continue
      }
      documentKeys.set(storageKey, mimeType)
    }

    const totals = (planTotals[period.plan_id] ??= { revenueCents: 0, expenseCents: 0, transactions: 0 })
    totals.transactions++
    if (t.type === "REVENUE") totals.revenueCents += t.amount_cents
    else totals.expenseCents += t.amount_cents

    const row = [
      t.id,
      period.plan_id,
      t.description,
      t.amount_cents,
      t.type,
      referenceDate,
      createdAt,
      t.category_id,
      t.responsible_user_id,
      t.recurring_group_id,
      t.display_order,
      t.credit_card_invoice_id,
      t.is_cleared_by_invoice ? 1 : 0,
      t.due_date,
      t.payment_date,
      t.payment_status,
      t.billing_document_type,
      t.billing_document_url,
      t.billing_document_file_name,
      mimeType,
      storageKey,
      toIsoInstant(t.billing_document_uploaded_at),
    ]
    transactions.push(row)

    const monthKey = `${period.plan_id}|${month}`
    if (month !== periodMonth(period)) {
      movedRows.push({ row, monthKey, order: t.display_order ?? 0 })
    } else {
      maxOrderByMonth.set(monthKey, Math.max(maxOrderByMonth.get(monthKey) ?? 0, t.display_order ?? 0))
    }
  }

  // Transações que mudaram de mês (fatura de outro período) vão para o fim da ordem do mês de
  // destino, mantendo a ordem relativa entre si, como a API faz ao mudar o mês de uma fatura.
  movedRows.sort((a, b) => a.order - b.order)
  for (const moved of movedRows) {
    const next = (maxOrderByMonth.get(moved.monthKey) ?? 0) + 1
    moved.row[DISPLAY_ORDER_INDEX] = next
    maxOrderByMonth.set(moved.monthKey, next)
  }

  if (movedToInvoiceMonth > 0) {
    warnings.push(`${movedToInvoiceMonth} transação(ões) estavam em período diferente da fatura e foram para o mês da fatura.`)
  }
  const periodsWithData = new Set(data.transactions.map((t) => t.period_id))
  const emptyPeriods = data.periods.filter((p) => !periodsWithData.has(p.id)).length
  if (emptyPeriods > 0) warnings.push(`${emptyPeriods} período(s) sem transações deixam de existir (o mês só aparece com dados).`)

  const statements = [
    ...inserts(
      "users",
      ["id", "email", "password", "name", "auth_provider", "google_subject", "email_verified"],
      data.users.map((u) => [
        u.id,
        u.email.trim().toLowerCase(),
        u.password,
        u.name,
        u.auth_provider,
        u.google_subject,
        u.email_verified ? 1 : 0,
      ]),
    ),
    ...inserts(
      "financial_plans",
      ["id", "owner_id", "name", "active_invite_token"],
      data.plans.map((p) => [p.id, p.owner_id, p.name, p.active_invite_token]),
    ),
    ...inserts(
      "financial_plan_partners",
      ["plan_id", "user_id"],
      data.partners.map((p) => [p.plan_id, p.user_id]),
    ),
    ...inserts(
      "transaction_categories",
      ["id", "name"],
      data.categories.map((c) => [c.id, c.name]),
    ),
    ...inserts(
      "credit_cards",
      ["id", "user_id", "name"],
      data.cards.map((c) => [c.id, c.user_id, c.name]),
    ),
    ...inserts(
      "credit_card_invoices",
      ["id", "plan_id", "credit_card_id", "reference_month", "amount_cents"],
      [...invoices.values()].map(({ row, planId, month }) => [row.id, planId, row.credit_card_id, month, row.amount_cents]),
    ),
    ...inserts(
      "transactions",
      [
        "id",
        "plan_id",
        "description",
        "amount_cents",
        "type",
        "reference_date",
        "created_at",
        "category_id",
        "responsible_user_id",
        "recurring_group_id",
        "display_order",
        "credit_card_invoice_id",
        "is_cleared_by_invoice",
        "due_date",
        "payment_date",
        "payment_status",
        "billing_document_type",
        "billing_document_url",
        "billing_document_file_name",
        "billing_document_mime_type",
        "billing_document_storage_key",
        "billing_document_uploaded_at",
      ],
      transactions,
    ),
  ]

  const expected: Expected = {
    generatedAt: new Date().toISOString(),
    counts: {
      users: data.users.length,
      financial_plans: data.plans.length,
      financial_plan_partners: data.partners.length,
      transaction_categories: data.categories.length,
      credit_cards: data.cards.length,
      credit_card_invoices: invoices.size,
      transactions: transactions.length,
    },
    planTotals,
    documentKeys: documentKeys.size,
  }

  return { errors, warnings, statements, expected, documentKeys }
}

function uploadScript(documentKeys: Map<string, string>): string {
  const lines = [
    "#!/usr/bin/env bash",
    "# Copia os comprovantes do disco da VPS para o R2, mantendo as chaves (AAAA/MM/uuid.ext).",
    "# Uso: ./upload-documents.sh <pasta payment-documents> [--remote|--local]",
    "set -euo pipefail",
    'DIR="${1:?informe a pasta payment-documents}"',
    'MODE="${2:---remote}"',
    'BUCKET="${R2_BUCKET:-finances-docs}"',
    "",
  ]
  for (const [key, mime] of documentKeys) {
    lines.push(
      `npx wrangler r2 object put "$BUCKET/"${shellQuote(key)} --file "$DIR/"${shellQuote(key)} --content-type ${shellQuote(mime)} "$MODE"`,
    )
  }
  lines.push(`echo "${documentKeys.size} arquivo(s) enviados."`, "")
  return lines.join("\n")
}

async function runExport(args: { out: string; documentsDir?: string }) {
  const url = process.env.MYSQL_URL
  if (!url) throw new Error("Defina MYSQL_URL (mysql://usuario:senha@host:porta/banco)")

  const { errors, warnings, statements, expected, documentKeys } = convert(await readAll(url))

  if (args.documentsDir) {
    for (const key of documentKeys.keys()) {
      if (!existsSync(path.join(args.documentsDir, key))) errors.push(`Arquivo de comprovante ausente no disco: ${key}`)
    }
  }

  for (const w of warnings) console.warn(`AVISO: ${w}`)
  if (errors.length > 0) {
    for (const e of errors) console.error(`ERRO: ${e}`)
    console.error(`\n${errors.length} problema(s) precisam ser corrigidos no MySQL antes de migrar. Nada foi gravado.`)
    process.exit(1)
  }

  mkdirSync(args.out, { recursive: true })
  writeFileSync(
    path.join(args.out, "d1-import.sql"),
    `-- Gerado por scripts/migrate-from-mysql.ts em ${expected.generatedAt}\n${statements.join("\n")}\n`,
  )
  writeFileSync(path.join(args.out, "expected.json"), `${JSON.stringify(expected, null, 2)}\n`)
  writeFileSync(path.join(args.out, "upload-documents.sh"), uploadScript(documentKeys), { mode: 0o755 })

  console.log("Export concluído:")
  for (const [table, n] of Object.entries(expected.counts)) console.log(`  ${table.padEnd(26)} ${n}`)
  console.log(`  comprovantes no R2         ${expected.documentKeys}`)
  console.log(`\nArquivos em ${args.out}/: d1-import.sql, expected.json, upload-documents.sh`)
}

// ---------------------------------------------------------------------------------------------
// Verify

function d1Query<T>(mode: "--local" | "--remote", sql: string): T[] {
  const output = execFileSync("npx", ["wrangler", "d1", "execute", "finances", mode, "--json", "--command", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
  const parsed = JSON.parse(output) as { results: T[] }[]
  return parsed[0]?.results ?? []
}

function runVerify(args: { dir: string; mode: "--local" | "--remote" }) {
  const expected = JSON.parse(readFileSync(path.join(args.dir, "expected.json"), "utf8")) as Expected
  const problems: string[] = []

  for (const [table, n] of Object.entries(expected.counts)) {
    const [row] = d1Query<{ n: number }>(args.mode, `select count(*) as n from ${table}`)
    if (row?.n !== n) problems.push(`${table}: esperado ${n}, D1 tem ${row?.n}`)
  }

  const totals = d1Query<{ plan_id: string; revenue: number; expense: number; n: number }>(
    args.mode,
    `select plan_id,
            sum(case when type = 'REVENUE' then amount_cents else 0 end) as revenue,
            sum(case when type = 'EXPENSE' then amount_cents else 0 end) as expense,
            count(*) as n
       from transactions group by plan_id`,
  )
  const actual = new Map(totals.map((t) => [t.plan_id, t]))
  for (const [planId, exp] of Object.entries(expected.planTotals)) {
    const got = actual.get(planId)
    if (!got || got.revenue !== exp.revenueCents || got.expense !== exp.expenseCents || got.n !== exp.transactions) {
      problems.push(`plano ${planId}: esperado ${JSON.stringify(exp)}, D1 tem ${JSON.stringify(got ?? null)}`)
    }
  }

  const [docs] = d1Query<{ n: number }>(
    args.mode,
    "select count(distinct billing_document_storage_key) as n from transactions where billing_document_storage_key is not null",
  )
  if (docs?.n !== expected.documentKeys) problems.push(`comprovantes: esperado ${expected.documentKeys}, D1 tem ${docs?.n}`)

  if (problems.length > 0) {
    for (const p of problems) console.error(`DIVERGÊNCIA: ${p}`)
    process.exit(1)
  }
  console.log(
    `OK: contagens de ${Object.keys(expected.counts).length} tabelas, totais de ${Object.keys(expected.planTotals).length} plano(s) e ${expected.documentKeys} comprovante(s) conferem.`,
  )
}

// ---------------------------------------------------------------------------------------------

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string", default: "migration" },
      dir: { type: "string", default: "migration" },
      "documents-dir": { type: "string" },
      local: { type: "boolean", default: false },
      remote: { type: "boolean", default: false },
    },
  })

  const command = positionals[0]
  if (command === "export") {
    await runExport({ out: values.out!, documentsDir: values["documents-dir"] })
  } else if (command === "verify") {
    if (values.local === values.remote) throw new Error("Use exatamente um entre --local e --remote")
    runVerify({ dir: values.dir!, mode: values.local ? "--local" : "--remote" })
  } else {
    console.error("Uso: node scripts/migrate-from-mysql.ts export|verify [opções] (ver cabeçalho do arquivo)")
    process.exit(1)
  }
}
