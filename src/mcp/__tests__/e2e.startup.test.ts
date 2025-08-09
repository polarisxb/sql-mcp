import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../transports/stdio.js', () => ({ startStdioServer: vi.fn(async () => undefined) }))
vi.mock('../transports/http.js', () => ({ startHttpServer: vi.fn(() => undefined) }))

// Mock connector to avoid real DB
vi.mock('../../connectors/mysql/connector.js', () => {
  return {
    MySQLConnector: class {
      async connect() { return }
      async disconnect() { return }
    }
  }
})

// Force config loader to deterministic config
vi.mock('../../core/config/index.js', async (importOriginal) => {
  const mod: any = await importOriginal()
  return {
    ...mod,
    loadConfig: () => ({
      database: { type: 'mysql', host: 'localhost', port: 3306, user: 'u', password: 'p', database: 'd', connectionTimeout: 1000 },
      cache: { enabled: false, ttl: 60, storage: 'memory', maxSize: 10, filePath: './cache' },
      security: { readOnly: true, sensitiveFields: ['password'], maxQueryLength: 5000 },
      logging: { level: 'error', destination: 'console', filePath: './logs/app.log' },
      mcp: { transport: 'stdio', httpPort: 3000, serverName: 'sql-mcp', serverVersion: '1.0.0' }
    })
  }
})

// Silence console during test
const originalLog = console.log
const originalError = console.error

describe('startup e2e', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    console.log = vi.fn() as any
    console.error = vi.fn() as any
  })
  afterEach(() => {
    console.log = originalLog
    console.error = originalError
    vi.clearAllMocks()
  })

  test('should start with stdio transport and allow graceful shutdown', async () => {
    const { start } = await import('../../index.js')
    const stdio = await import('../transports/stdio.js') as any

    await start()

    expect(stdio.startStdioServer).toHaveBeenCalled()

    // Simulate SIGINT
    process.emit('SIGINT')
  }, 10000)
}) 