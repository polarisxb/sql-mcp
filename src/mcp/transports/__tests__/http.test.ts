import { describe, test, expect, vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as httpTransport from '../../transports/http.js'

// We will spy on express default export by mocking module factory
vi.mock('express', () => {
  const routes: any = {}
  const app = {
    use: vi.fn(),
    get: vi.fn((path: string, handler: any) => { routes[path] = handler }),
    post: vi.fn((path: string, handler: any) => { routes.post = handler }),
    delete: vi.fn((path: string, handler: any) => { routes.delete = handler }),
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
      async handleRequest() {}
      close() {}
      onclose?: () => void
    }
  }
})

describe('http transport', () => {
  test('startHttpServer registers routes and listens', async () => {
    const exp = (await import('express')).default as any
    const app = (exp as any)().__app || (exp as any).__app
    const routes = (app as any).__routes

    const factory = () => new McpServer({ name: 't', version: '1.0.0' })
    httpTransport.startHttpServer(factory, 12345)

    expect(app.use).toHaveBeenCalled()
    expect(app.get).toHaveBeenCalledWith('/health', expect.any(Function))
    expect(app.post).toHaveBeenCalledWith('/mcp', expect.any(Function))
    expect(app.get).toHaveBeenCalledWith('/mcp', expect.any(Function))
    expect(app.delete).toHaveBeenCalledWith('/mcp', expect.any(Function))
    expect(app.listen).toHaveBeenCalledWith(12345, expect.any(Function))

    // call health handler
    const health = routes['/health']
    const res: any = { status: vi.fn(() => res), json: vi.fn() }
    await health({}, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ok' })
  })
}) 