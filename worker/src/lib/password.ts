import bcrypt from "bcryptjs"

// Senhas novas: PBKDF2-SHA256 via WebCrypto (nativo, barato em CPU no Workers).
// Senhas legadas do Spring (BCrypt `$2a$`/`$2b$`) continuam válidas e são regravadas
// em PBKDF2 no primeiro login bem-sucedido (ver needsRehash).

const PBKDF2_PREFIX = "pbkdf2_sha256"
// 100_000 é o máximo aceito pelo PBKDF2 do runtime do Workers. O valor usado vem de
// PASSWORD_PBKDF2_ITERATIONS (wrangler.jsonc) e é baixo de propósito para caber no limite
// de 10 ms de CPU do plano gratuito. As iterações ficam gravadas no hash, então mudar o
// valor depois só exige o rehash que já acontece no login (needsRehash).
const MAX_ITERATIONS = 100_000

export function resolveIterations(configured: string | undefined): number {
  const value = Number(configured)
  if (!Number.isInteger(value) || value < 1 || value > MAX_ITERATIONS) {
    throw new RangeError(`PASSWORD_PBKDF2_ITERATIONS inválido: ${configured}`)
  }
  return value
}
const SALT_BYTES = 16
const KEY_BITS = 256

const encoder = new TextEncoder()

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function hashPassword(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, iterations)
  return `${PBKDF2_PREFIX}$${iterations}$${toBase64(salt)}$${toBase64(hash)}`
}

export function isLegacyHash(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (isLegacyHash(stored)) {
    return bcrypt.compare(password, stored)
  }

  const [prefix, iterations, salt, hash] = stored.split("$")
  const rounds = Number(iterations)
  if (prefix !== PBKDF2_PREFIX || !Number.isInteger(rounds) || rounds < 1 || rounds > MAX_ITERATIONS || !salt || !hash) {
    return false
  }

  const derived = await derive(password, fromBase64(salt), rounds)
  return timingSafeEqual(derived, fromBase64(hash))
}

/** Hash BCrypt legado ou PBKDF2 com iterações diferentes da configuração atual. */
export function needsRehash(stored: string, iterations: number): boolean {
  return isLegacyHash(stored) || !stored.startsWith(`${PBKDF2_PREFIX}$${iterations}$`)
}
