// Erros no formato ProblemDetail (RFC 9457), igual ao CustomEntityResponseHandler do Spring,
// para o frontend (frontend/src/lib/errors.ts) continuar lendo `title`, `detail` e `errors`.

export type ProblemDetail = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  timestamp: string
  errors?: Record<string, string>
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    detail: string,
    readonly errors?: Record<string, string>,
  ) {
    super(detail)
  }

  toProblem(instance?: string): ProblemDetail {
    return {
      type: "about:blank",
      title: this.title,
      status: this.status,
      detail: this.message,
      instance,
      timestamp: new Date().toISOString(),
      ...(this.errors ? { errors: this.errors } : {}),
    }
  }
}

export const notFound = (detail: string) => new ApiError(404, "Recurso não encontrado", detail)
export const badRequest = (detail: string) => new ApiError(400, "Requisição inválida", detail)
export const unauthorized = (detail: string) => new ApiError(401, "Credenciais inválidas", detail)
export const forbidden = (detail: string) => new ApiError(403, "Acesso negado", detail)
export const validationError = (errors: Record<string, string>) =>
  new ApiError(400, "Erro de validação", "Um ou mais campos estão inválidos.", errors)
