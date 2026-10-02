import { SignJWT, jwtVerify } from "jose"

// Compatível com o JwtService do Java: HS256, chave = segredo em base64, `sub` = e-mail,
// claim `token_type` = access | refresh. Assim, tokens emitidos pelo backend antigo
// continuam válidos durante a troca.

export type TokenType = "access" | "refresh"

type JwtEnv = Pick<
  Env,
  | "JWT_ACCESS_TOKEN_SECRET"
  | "JWT_REFRESH_TOKEN_SECRET"
  | "JWT_ACCESS_TOKEN_EXPIRATION_MS"
  | "JWT_REFRESH_TOKEN_EXPIRATION_MS"
>

const keyCache = new Map<string, Uint8Array>()

function signingKey(secretBase64: string): Uint8Array {
  let key = keyCache.get(secretBase64)
  if (!key) {
    key = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0))
    keyCache.set(secretBase64, key)
  }
  return key
}

function settings(env: JwtEnv, type: TokenType) {
  return type === "access"
    ? { secret: env.JWT_ACCESS_TOKEN_SECRET, expirationMs: Number(env.JWT_ACCESS_TOKEN_EXPIRATION_MS) }
    : { secret: env.JWT_REFRESH_TOKEN_SECRET, expirationMs: Number(env.JWT_REFRESH_TOKEN_EXPIRATION_MS) }
}

export async function signToken(env: JwtEnv, type: TokenType, email: string): Promise<string> {
  const { secret, expirationMs } = settings(env, type)
  const now = Date.now()
  return new SignJWT({ token_type: type })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor((now + expirationMs) / 1000))
    .sign(signingKey(secret))
}

/** Retorna o e-mail (`sub`) se o token for válido e do tipo esperado; senão, null. */
export async function verifyToken(env: JwtEnv, type: TokenType, token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(settings(env, type).secret), {
      algorithms: ["HS256"],
    })
    if (payload.token_type !== type || typeof payload.sub !== "string") {
      return null
    }
    return payload.sub
  } catch {
    return null
  }
}
