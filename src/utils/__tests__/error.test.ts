import { describe, test, expect } from 'vitest'
import { AppError, toAppError, formatError, errorInfo } from '../error.js'

describe('error util', () => {
  test('wraps unknown error to AppError', () => {
    const appErr = toAppError(new Error('boom'), 'DB_QUERY_FAILED')
    expect(appErr).toBeInstanceOf(AppError)
    expect(appErr.code).toBe('DB_QUERY_FAILED')
  })

  test('formatError includes code and message', () => {
    const err = new AppError('VALIDATION_FAILED', 'bad input', { details: { field: 'name' } })
    const txt = formatError(err)
    expect(txt).toContain('[VALIDATION_FAILED]')
    expect(txt).toContain('bad input')
    expect(txt).toContain('field')
  })

  test('errorInfo returns structured info', () => {
    const err = new AppError('NOT_FOUND', 'missing')
    const info = errorInfo(err)
    expect(info.code).toBe('NOT_FOUND')
    expect(info.httpStatus).toBe(404)
    expect(info.message).toBe('missing')
  })
}) 