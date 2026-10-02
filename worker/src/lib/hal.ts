// Formato HAL do Spring HATEOAS: `_links` nos itens e `_embedded.<chave>` nas coleções.
// Os hrefs são relativos (/api/...); o frontend (resolveLink) aceita relativo ou absoluto.

type LinkMap = Record<string, string | null | undefined>

export function toLinks(links: LinkMap): Record<string, { href: string }> {
  const result: Record<string, { href: string }> = {}
  for (const [rel, href] of Object.entries(links)) {
    if (href) result[rel] = { href }
  }
  return result
}

export function withLinks<T extends object>(data: T, links: LinkMap) {
  return { ...data, _links: toLinks(links) }
}

/** Diferente do Spring, `_embedded` vem sempre presente, mesmo vazio. */
export function collection<Key extends string, T>(key: Key, items: T[], self: string) {
  return {
    _embedded: { [key]: items } as Record<Key, T[]>,
    _links: toLinks({ self }),
  }
}
