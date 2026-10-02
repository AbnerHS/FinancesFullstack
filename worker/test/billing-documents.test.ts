import { env } from "cloudflare:test"
import { describe, expect, it } from "vitest"
import { api, as, createPlan, createUser, json, type TestUser } from "./helpers.ts"

const PDF_BYTES = new TextEncoder().encode("%PDF-1.4 conteúdo de teste")

function upload(user: TestUser, transactionId: string, file: File, scope?: "SINGLE" | "GROUP") {
  const form = new FormData()
  form.append("file", file)
  const query = scope ? `?scope=${scope}` : ""
  return api(`/transactions/${transactionId}/billing-document/file${query}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${user.token}` },
    body: form,
  })
}

const pdf = (name = "boleto.pdf", type = "application/pdf") => new File([PDF_BYTES], name, { type })

async function setup() {
  const owner = await createUser()
  const plan = await createPlan(owner)
  const create = (extra: Record<string, unknown> = {}) =>
    json(
      as(owner).post("/transactions", {
        planId: plan.id,
        description: "Conta",
        amount: 10,
        type: "EXPENSE",
        referenceDate: "2026-10-01",
        dueDate: "2026-10-10",
        ...extra,
      }),
      201,
    )
  return { owner, plan, create }
}

const storageKeyOf = async (id: string) =>
  (
    await env.DB.prepare("select billing_document_storage_key as k from transactions where id = ?")
      .bind(id)
      .first<{ k: string | null }>()
  )?.k ?? null

describe("upload de comprovante", () => {
  it("grava no R2 e devolve a transação com o documento", async () => {
    const { owner, create } = await setup()
    const transaction = await create()

    const updated = await json(upload(owner, transaction.id, pdf("Conta de luz.pdf")))
    expect(updated.billingDocument).toMatchObject({
      type: "FILE",
      fileName: "Conta de luz.pdf",
      mimeType: "application/pdf",
      url: null,
      downloadUrl: `/api/transactions/${transaction.id}/billing-document/download`,
      uploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })

    const key = await storageKeyOf(transaction.id)
    expect(key).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/)
    const object = await env.DOCS.get(key!)
    expect(new Uint8Array(await object!.arrayBuffer())).toEqual(PDF_BYTES)
  })

  it("ignora o Content-Type do navegador e usa o da extensão", async () => {
    const { owner, create } = await setup()
    const transaction = await create()
    const updated = await json(upload(owner, transaction.id, pdf("fatura.PDF", "text/html")))
    expect(updated.billingDocument.mimeType).toBe("application/pdf")
  })

  it("valida vencimento, extensão, arquivo vazio, tamanho e scope", async () => {
    const { owner, create } = await setup()
    const withoutDueDate = await create({ dueDate: null })
    expect(await json(upload(owner, withoutDueDate.id, pdf()), 400)).toMatchObject({
      detail: "Somente transações com vencimento podem receber documento para pagamento.",
    })

    const transaction = await create()
    expect((await upload(owner, transaction.id, new File(["x"], "script.html"))).status).toBe(400)
    expect((await upload(owner, transaction.id, new File(["x"], "semextensao"))).status).toBe(400)
    expect((await upload(owner, transaction.id, new File([], "vazio.pdf"))).status).toBe(400)

    const big = new File([new Uint8Array(1024 * 1024 + 1)], "grande.pdf")
    expect(await json(upload(owner, transaction.id, big), 400)).toMatchObject({
      detail: "O arquivo deve ter no máximo 1 MB.",
    })

    expect((await upload(owner, transaction.id, pdf(), "TODOS" as "GROUP")).status).toBe(400)
  })

  it("recusa cedo (413) pelo Content-Length, sem ler o corpo", async () => {
    const { owner, create } = await setup()
    const transaction = await create()
    const form = new FormData()
    form.append("file", new File([new Uint8Array(1024 * 1024 + 128 * 1024)], "grande.pdf"))
    // Serializa como o navegador faz, com Content-Length explícito.
    const encoded = new Response(form)
    const body = await encoded.arrayBuffer()

    const res = await api(`/transactions/${transaction.id}/billing-document/file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${owner.token}`,
        "Content-Type": encoded.headers.get("Content-Type")!,
        "Content-Length": String(body.byteLength),
      },
      body,
    })
    expect(res.status).toBe(413)
    expect(await storageKeyOf(transaction.id)).toBeNull()
  })

  it("substituir o arquivo apaga o antigo do R2", async () => {
    const { owner, create } = await setup()
    const transaction = await create()
    await json(upload(owner, transaction.id, pdf("v1.pdf")))
    const oldKey = await storageKeyOf(transaction.id)

    await json(upload(owner, transaction.id, pdf("v2.pdf")))
    expect(await storageKeyOf(transaction.id)).not.toBe(oldKey)
    expect(await env.DOCS.head(oldKey!)).toBeNull()
  })

  it("scope GROUP aplica o mesmo arquivo a todas as recorrências", async () => {
    const { owner, plan } = await setup()
    const group = await json(
      as(owner).post("/transactions/recurring", {
        transaction: {
          planId: plan.id,
          description: "Internet",
          amount: 100,
          type: "EXPENSE",
          referenceDate: "2026-10-01",
          dueDate: "2026-10-10",
        },
        occurrences: 3,
      }),
    )

    await json(upload(owner, group[1].id, pdf(), "GROUP"))
    const keys = await Promise.all(group.map((t: any) => storageKeyOf(t.id)))
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).not.toBeNull()

    // Remover só de uma ocorrência mantém o arquivo (ainda em uso pelas outras).
    await json(as(owner).delete(`/transactions/${group[0].id}/billing-document`))
    expect(await env.DOCS.head(keys[0]!)).not.toBeNull()

    // Remover do grupo apaga do R2.
    const cleared = await json(as(owner).delete(`/transactions/${group[1].id}/billing-document?scope=GROUP`))
    expect(cleared.billingDocument).toBeNull()
    expect(await env.DOCS.head(keys[0]!)).toBeNull()
  })

  it("trocar para link pelo PATCH remove o arquivo do R2", async () => {
    const { owner, create } = await setup()
    const transaction = await create()
    await json(upload(owner, transaction.id, pdf()))
    const key = await storageKeyOf(transaction.id)

    const updated = await json(
      as(owner).patch(`/transactions/${transaction.id}`, { billingDocument: { type: "LINK", url: "https://x.example" } }),
    )
    expect(updated.billingDocument).toMatchObject({ type: "LINK" })
    expect(await env.DOCS.head(key!)).toBeNull()
  })
})

describe("download de comprovante", () => {
  it("devolve o arquivo com headers seguros", async () => {
    const { owner, create } = await setup()
    const transaction = await create()
    await json(upload(owner, transaction.id, pdf("Fatura março.pdf")))

    const res = await as(owner).get(`/transactions/${transaction.id}/billing-document/download`)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(res.headers.get("Content-Security-Policy")).toContain("sandbox")
    expect(res.headers.get("Content-Disposition")).toBe(
      `attachment; filename="Fatura marc_o.pdf"; filename*=UTF-8''${encodeURIComponent("Fatura março.pdf")}`,
    )
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PDF_BYTES)
  })

  it("404 sem arquivo e 403 para quem não participa", async () => {
    const { owner, create } = await setup()
    const transaction = await create()
    expect((await as(owner).get(`/transactions/${transaction.id}/billing-document/download`)).status).toBe(404)

    await json(upload(owner, transaction.id, pdf()))
    const stranger = await createUser()
    expect((await as(stranger).get(`/transactions/${transaction.id}/billing-document/download`)).status).toBe(403)
    expect((await upload(stranger, transaction.id, pdf())).status).toBe(403)
  })
})

describe("limpeza do R2", () => {
  it("excluir a transação ou o plano apaga os arquivos", async () => {
    const { owner, plan, create } = await setup()
    const first = await create()
    const second = await create()
    await json(upload(owner, first.id, pdf()))
    await json(upload(owner, second.id, pdf()))
    const firstKey = await storageKeyOf(first.id)
    const secondKey = await storageKeyOf(second.id)

    expect((await as(owner).delete(`/transactions/${first.id}`)).status).toBe(204)
    expect(await env.DOCS.head(firstKey!)).toBeNull()

    expect((await as(owner).delete(`/plans/${plan.id}`)).status).toBe(204)
    expect(await env.DOCS.head(secondKey!)).toBeNull()
  })
})
