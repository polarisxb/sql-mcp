import { describe, test, expect, vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as httpTransport from '../../transports/http.js'
import { container } from '../../../core/di/index.js'
import { APP_CONFIG } from '../../../core/di/tokens.js'

// We will spy on express default export by mocking module factory
vi.mock('express', () => {
  const routes: any = {}
  const app = {
    use: vi.fn(),
    get: vi.fn((path: string, ...handlers: any[]) => { routes[path] = handlers }),
    post: vi.fn((path: string, ...handlers: any[]) => { routes.post = handlers }),
    delete: vi.fn((path: string, ...handlers: any[]) => { routes.delete = handlers }),
    listen: vi.fn((_port: number, _cb?: () => void) => {})
  }
  const fn = () => app
  ;(fn as any).json = () => (req: any, res: any, next: any) => next && next()
  ;(app as any).__app = app
  ;(app as any).__routes = routes
  return { default: fn }
})

// Mock StreamableHTTPServerTransport
vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => {
  return {
    StreamableHTTPServerTransport: class {
      sessionId?: string
      constructor(_: any) {}
      async start() { /* no-op for tests */ }
      async handleRequest() {}
      close() {}
      onclose?: () => void
    }
  }
})

describe('http transport', () => {
  test('startHttpServer registers routes and listens', async () => {
    // Register minimal APP_CONFIG so http transport can resolve it
    container.registerInstance(APP_CONFIG, {
      database: {} as any,
      cache: {} as any,
      security: { readOnly: true, sensitiveFields: [], maxQueryLength: 1000, sampleMaxRows: 100, queryTimeoutMs: 10000 },
      logging: {} as any,
      mcp: { transport: 'http', httpPort: 12345, serverName: 't', serverVersion: '1.0.0' }
    } as any)

    const exp = (await import('express')).default as any
    const app = (exp as any)().__app || (exp as any).__app
    const routes = (app as any).__routes

    const factory = () => new McpServer({ name: 't', version: '1.0.0' })
    httpTransport.startHttpServer(factory, 12345)

    expect(app.use).toHaveBeenCalled()
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function))
    // Middlewares for POST: cors, hostCheck, rateLimit, timing, auth + handler
    expect(app.post).toHaveBeenCalledWith('/mcp', expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function))
    // Middlewares for GET/DELETE: same as POST
    expect(app.get).toHaveBeenCalledWith('/mcp', expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function))
    expect(app.delete).toHaveBeenCalledWith('/mcp', expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function), expect.any(Function))
    expect(app.listen).toHaveBeenCalledWith(12345, expect.any(Function))

    // call health handler
    const healthHandlers = routes['/health']
    const res: any = { status: vi.fn(() => res), json: vi.fn() }
    await healthHandlers[0]({}, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })

  test('http API key auth denies missing key and accepts correct key', async () => {
    // Reset express mock routes for a clean state
    const exp = (await import('express')).default as any
    const app = (exp as any)()
    // clear existing routes in-place (do not replace object reference)
    const routesObj = (app as any).__routes
    for (const k of Object.keys(routesObj)) delete routesObj[k]

    // Register APP_CONFIG with api key
    container.registerInstance(APP_CONFIG, {
      database: {} as any,
      cache: {} as any,
      security: { readOnly: true, sensitiveFields: [], maxQueryLength: 1000, sampleMaxRows: 100, queryTimeoutMs: 10000 },
      logging: {} as any,
      mcp: { transport: 'http', httpPort: 12345, serverName: 't', serverVersion: '1.0.0', httpApiKey: 'k' }
    } as any)

    const factory = () => new McpServer({ name: 't', version: '1.0.0' })
    httpTransport.startHttpServer(factory, 12345)

    const routes = (app as any).__routes
    const postHandlers = routes.post as any[]
    expect(Array.isArray(postHandlers)).toBe(true)
    // Middlewares: cors, hostCheck, rateLimit, timing, auth, handler
    const authMw = postHandlers[4]
    const handler = postHandlers[5]

    // Missing key -> 401
    const reqNoKey: any = { headers: {}, query: {} }
    const resNoKey: any = { status: vi.fn(() => resNoKey), json: vi.fn() }
    const next = vi.fn()
    await authMw(reqNoKey, resNoKey, next)
    expect(resNoKey.status).toHaveBeenCalledWith(401)

    // Correct key -> next() then handler executes (should reach handler without error)
    const reqWithKey: any = { headers: { 'x-api-key': 'k' }, query: {} }
    const resOK: any = { status: vi.fn(() => resOK), json: vi.fn(), send: vi.fn() }
    const next2 = vi.fn()
    await authMw(reqWithKey, resOK, next2)
    expect(next2).toHaveBeenCalled()
    // Call handler to ensure it is callable
    await handler({ headers: {}, body: {} }, { status: vi.fn(() => resOK), json: vi.fn(), send: vi.fn() })
  })
}) 