export type ErrorCode =
  | 'CONFIG_INVALID'
  | 'DB_CONNECTION_FAILED'
  | 'DB_QUERY_FAILED'
  | 'SECURITY_VIOLATION'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'

export interface ErrorInfo {
  code: ErrorCode
  httpStatus?: number
  retriable?: boolean
  message: string
}

const ERROR_MAP: Record<ErrorCode, Omit<ErrorInfo, 'message'>> = {
  CONFIG_INVALID: { code: 'CONFIG_INVALID', httpStatus: 400, retriable: false },
  DB_CONNECTION_FAILED: { code: 'DB_CONNECTION_FAILED', httpStatus: 503, retriable: true },
  DB_QUERY_FAILED: { code: 'DB_QUERY_FAILED', httpStatus: 500, retriable: true },
  SECURITY_VIOLATION: { code: 'SECURITY_VIOLATION', httpStatus: 400, retriable: false },
  VALIDATION_FAILED: { code: 'VALIDATION_FAILED', httpStatus: 400, retriable: false },
  NOT_FOUND: { code: 'NOT_FOUND', httpStatus: 404, retriable: false },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', httpStatus: 401, retriable: false },
  FORBIDDEN: { code: 'FORBIDDEN', httpStatus: 403, retriable: false },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', httpStatus: 500, retriable: true },
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly httpStatus?: number
  public readonly retriable?: boolean
  public readonly causeError?: unknown
  public readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message?: string, options?: {
    cause?: unknown
    details?: Record<string, unknown>
  }) {
    const defaultInfo = ERROR_MAP[code]
    super(message ?? code)
    this.name = 'AppError'
    this.code = defaultInfo.code
    this.httpStatus = defaultInfo.httpStatus
    this.retriable = defaultInfo.retriable
    this.causeError = options?.cause
    this.details = options?.details
  }
}

export function toAppError(err: unknown, fallback: ErrorCode = 'INTERNAL_ERROR'): AppError {
  if (err instanceof AppError) return err
  if (err instanceof Error) {
    return new AppError(fallback, err.message, { cause: err })
  }
  return new AppError(fallback, String(err))
}

export function formatError(err: unknown): string {
  const appErr = toAppError(err)
  const parts = [`[${appErr.code}] ${appErr.message}`]
  if (appErr.details) parts.push(JSON.stringify(appErr.details))
  if (appErr.stack) parts.push(appErr.stack)
  return parts.join(' | ')
}

export function errorInfo(err: unknown): ErrorInfo {
  const appErr = toAppError(err)
  return {
    code: appErr.code,
    httpStatus: appErr.httpStatus,
    retriable: appErr.retriable,
    message: appErr.message,
  }
} 