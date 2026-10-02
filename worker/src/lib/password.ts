import bcrypt from "bcryptjs"

// Senhas novas: PBKDF2-SHA256 via WebCrypto (nativo, barato em CPU no Workers).
// Senhas legadas do Spring (BCrypt `$2a$`/`$2b$`) continuam válidas e são regravadas
// em PBKDF2 no primeiro login bem-sucedido (ver needsRehash).

const PBKDF2_PREFIX = "pbkdf2_sha256"
// 100_000 é o máximo de iterações aceito pelo PBKDF2 do runtime do Workers.
const PBKDF2_ITERATIONS = 100_000
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

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derive(password, salt, PBKDF2_ITERATIONS)
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`
}

export function isLegacyHash(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (isLegacyHash(stored)) {
    return bcrypt.compare(password, stored)
  }

  const [prefix, iterations, salt, hash] = stored.split("$")
  if (prefix !== PBKDF2_PREFIX || !iterations || !salt || !hash) {
    return false
  }

  const derived = await derive(password, fromBase64(salt), Number(iterations))
  return timingSafeEqual(derived, fromBase64(hash))
}

export function needsRehash(stored: string): boolean {
  return isLegacyHash(stored) || !stored.startsWith(`${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$`)
}
