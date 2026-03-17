import type { LinkObject } from "@/lib/api/types.ts"

export function resolveLink(linkOrHref: LinkObject | string | null | undefined) {
  const href = typeof linkOrHref === "string" ? linkOrHref : linkOrHref?.href
  if (!href) {
    return null
  }

  if (href.startsWith("/")) {
    return href.replace(/^\/api(\/|$)/, "/")
  }

  if (!href.startsWith("http") && !href.includes("/")) {
    return null
  }

  try {
    const url = new URL(href)
    return url.pathname.replace(/^\/api(\/|$)/, "/")
  } catch {
    const path = href.replace(/^\/api(\/|$)/, "/")
    return path.startsWith("/") ? path : `/${path}`
  }
}
