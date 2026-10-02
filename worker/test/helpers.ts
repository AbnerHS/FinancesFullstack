import { exports } from "cloudflare:workers"

export const api = (path: string, init?: RequestInit) =>
  exports.default.fetch(new Request(`https://finances.test/api${path}`, init))

export const postJson = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })

/** Extrai `refresh_token=...` do Set-Cookie para reenviar como header Cookie. */
export function refreshCookie(res: Response): string | null {
  const header = res.headers.getSetCookie().find((c) => c.startsWith("refresh_token="))
  return header ? header.split(";")[0]! : null
}
