import { describe, test, expect, vi, beforeEach } from 'vitest'
import { maskSensitive, hasSqlInjectionRisk, assertNoSqlInjection, CredentialManager } from '../security.js'

describe('security util', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  test('maskSensitive masks known fields recursively', () => {
    const input = {
      user: 'a',
      password: 'secret',
      nested: { token: 'ttt', keep: 'ok' },
      arr: [{ apiKey: 'k' }, { other: 'x' }],
    }
    const masked = maskSensitive(input)
    expect(masked.password).toBe('***')
    expect(masked.nested.token).toBe('***')
    expect(masked.arr[0].apiKey).toBe('***')
    expect(masked.nested.keep).toBe('ok')
  })

  test('CredentialManager encrypts and decrypts with secret', () => {
    vi.stubEnv('SQL_MCP_SECRET', 's3cret')
    const cm = new CredentialManager()
    const enc = cm.encrypt('hello')
    expect(enc).not.toBe('hello')
    const dec = cm.decrypt(enc)
    expect(dec).toBe('hello')
  })

  test('hasSqlInjectionRisk detects suspicious patterns', () => {
    expect(hasSqlInjectionRisk("1; DROP TABLE users")).toBe(true)
    expect(hasSqlInjectionRisk("name = 'a'")) .toBe(false)
  })

  test('assertNoSqlInjection throws on dangerous input', () => {
    expect(() => assertNoSqlInjection('-- comment')).toThrow()
  })
}) 