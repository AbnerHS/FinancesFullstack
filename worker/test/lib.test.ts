import bcrypt from "bcryptjs"
import { env } from "cloudflare:test"
import { SignJWT } from "jose"
import { describe, expect, it } from "vitest"
import { addMonths, isIsoDate, isYearMonth, monthBounds, moveToMonth } from "../src/lib/dates.ts"
import { fromCents, toCents } from "../src/lib/money.ts"
import { hashPassword, needsRehash, resolveIterations, verifyPassword } from "../src/lib/password.ts"
import { signToken, verifyToken } from "../src/lib/jwt.ts"

describe("money", () => {
  it("converte decimais para centavos sem erro de ponto flutuante", () => {
    expect(toCents(12.34)).toBe(1234)
    expect(toCents(1.005)).toBe(101)
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(-45.5)).toBe(-4550)
    expect(toCents(-1.005)).toBe(-101)
    expect(toCents(0)).toBe(0)
    expect(fromCents(1234)).toBe(12.34)
    expect(fromCents(null)).toBeNull()
  })

  it("rejeita valores não finitos", () => {
    expect(() => toCents(Number.NaN)).toThrow(RangeError)
  })
})

describe("dates", () => {
  it("valida datas e meses", () => {
    expect(isIsoDate("2026-02-28")).toBe(true)
    expect(isIsoDate("2026-02-29")).toBe(false)
    expect(isIsoDate("2028-02-29")).toBe(true)
    expect(isYearMonth("2026-10")).toBe(true)
    expect(isYearMonth("2026-13")).toBe(false)
  })

  it("soma meses limitando ao fim do mês, como shiftToPeriod", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15")
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28")
  })

  it("move a data para o mês da fatura mantendo o dia", () => {
    expect(moveToMonth("2026-01-31", "2026-02")).toBe("2026-02-28")
    expect(moveToMonth("2026-01-10", "2026-03")).toBe("2026-03-10")
  })

  it("calcula limites do mês", () => {
    expect(monthBounds("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" })
  })
})

describe("password", () => {
  it("gera e verifica hash PBKDF2 com as iterações informadas", async () => {
    const hash = await hashPassword("s3nha-forte", 20_000)
    expect(hash.startsWith("pbkdf2_sha256$20000$")).toBe(true)
    expect(await verifyPassword("s3nha-forte", hash)).toBe(true)
    expect(await verifyPassword("errada", hash)).toBe(false)
    expect(needsRehash(hash, 20_000)).toBe(false)
  })

  it("pede rehash quando as iterações configuradas mudam", async () => {
    const hash = await hashPassword("s3nha-forte", 1_000)
    expect(await verifyPassword("s3nha-forte", hash)).toBe(true)
    expect(needsRehash(hash, 20_000)).toBe(true)
  })

  it("valida a configuração de iterações", () => {
    expect(resolveIterations("20000")).toBe(20_000)
    expect(() => resolveIterations("0")).toThrow(RangeError)
    expect(() => resolveIterations("100001")).toThrow(RangeError)
    expect(() => resolveIterations(undefined)).toThrow(RangeError)
  })

  it("recusa hash PBKDF2 com iterações fora do limite", async () => {
    expect(await verifyPassword("x", "pbkdf2_sha256$999999$AAAA$AAAA")).toBe(false)
  })

  it("aceita hash BCrypt legado do Spring e pede rehash", async () => {
    const legacy = bcrypt.hashSync("senha-antiga", 4).replace(/^\$2b\$/, "$2a$")
    expect(await verifyPassword("senha-antiga", legacy)).toBe(true)
    expect(await verifyPassword("outra", legacy)).toBe(false)
    expect(needsRehash(legacy, 20_000)).toBe(true)
  })
})

describe("jwt", () => {
  it("emite e valida access e refresh tokens separadamente", async () => {
    const access = await signToken(env, "access", "ana@example.com")
    const refresh = await signToken(env, "refresh", "ana@example.com")

    expect(await verifyToken(env, "access", access)).toBe("ana@example.com")
    expect(await verifyToken(env, "refresh", refresh)).toBe("ana@example.com")
    expect(await verifyToken(env, "access", refresh)).toBeNull()
    expect(await verifyToken(env, "refresh", access)).toBeNull()
  })

  it("aceita token no formato emitido pelo JwtService do Java", async () => {
    const key = Uint8Array.from(atob(env.JWT_ACCESS_TOKEN_SECRET), (c) => c.charCodeAt(0))
    const now = Math.floor(Date.now() / 1000)
    const javaToken = await new SignJWT({ token_type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("bia@example.com")
      .setIssuedAt(now)
      .setExpirationTime(now + 60)
      .sign(key)

    expect(await verifyToken(env, "access", javaToken)).toBe("bia@example.com")
  })

  it("rejeita token expirado", async () => {
    const expired = await signToken({ ...env, JWT_ACCESS_TOKEN_EXPIRATION_MS: "-1000" }, "access", "x@y.z")
    expect(await verifyToken(env, "access", expired)).toBeNull()
  })
})
