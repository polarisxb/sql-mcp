import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../index.js', () => ({ start: vi.fn(async () => undefined) }))

const originalArgv = process.argv
const originalExit = process.exit

describe('cli', () => {
  beforeEach(() => {
    process.argv = ['node', 'cli', '--host', '127.0.0.1', '--port', '3306', '--user', 'root', '--password', 'p', '--database', 'db', '--type', 'mysql', '--transport', 'stdio', '--httpPort', '1234', '--cacheEnabled', 'true', '--cacheTTL', '60', '--cacheStorage', 'memory']
    ;(process.exit as any) = vi.fn()
  })
  afterEach(() => {
    process.argv = originalArgv
    ;(process.exit as any) = originalExit
    vi.clearAllMocks()
  })

  test('parses args and sets env then calls start', async () => {
    await import('../../cli.js')
    const { start } = await import('../../index.js') as any

    expect(process.env.SQL_MCP_DB_HOST).toBe('127.0.0.1')
    expect(process.env.SQL_MCP_DB_PORT).toBe('3306')
    expect(process.env.SQL_MCP_DB_USER).toBe('root')
    expect(process.env.SQL_MCP_DB_PASSWORD).toBe('p')
    expect(process.env.SQL_MCP_DB_NAME).toBe('db')
    expect(process.env.SQL_MCP_DB_TYPE).toBe('mysql')
    expect(process.env.SQL_MCP_MCP_TRANSPORT).toBe('stdio')
    expect(process.env.SQL_MCP_MCP_HTTP_PORT).toBe('1234')
    expect(process.env.SQL_MCP_CACHE_ENABLED).toBe('true')
    expect(process.env.SQL_MCP_CACHE_TTL).toBe('60')
    expect(process.env.SQL_MCP_CACHE_STORAGE).toBe('memory')

    expect(start).toHaveBeenCalled()
  })
}) 