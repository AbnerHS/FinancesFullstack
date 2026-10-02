import { zValidator } from "@hono/zod-validator"
import type { ValidationTargets } from "hono"
import type { ZodType } from "zod"
import { validationError } from "./errors.ts"

// Equivalente ao @Valid + handleMethodArgumentNotValid: erros de validação viram
// ProblemDetail 400 com `errors: { campo: mensagem }`.
export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>(
  target: Target,
  schema: Schema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path.join(".") || "body"
        errors[field] ??= issue.message
      }
      throw validationError(errors)
    }
  })
