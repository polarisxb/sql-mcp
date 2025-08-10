import express from 'express'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { container } from '../../core/di/index.js'
import { APP_CONFIG, LOGGER_SERVICE } from '../../core/di/tokens.js'
import { createRateLimitMiddleware } from '../../middleware/rate-limit.js'

export function startHttpServer(serverFactory: () => McpServer, port: number = 3000) {
  const app = express()
  app.use(express.json())

  const transports: Record<string, StreamableHTTPServerTransport> = {}

  // Optional API key & logging
  let config: any
  let logger: any
  try { config = container.resolve(APP_CONFIG) as any } catch { config = undefined }
  try { logger = container.resolve(LOGGER_SERVICE) as any } catch { logger = console }

  const apiKey: string | undefined = config?.mcp?.httpApiKey
  const apiKeys: string[] = Array.isArray(config?.mcp?.httpApiKeys) ? config.mcp.httpApiKeys : []
  const requireAuth = Boolean(apiKey) || apiKeys.length > 0
  const enableHttpLogs = config?.logging?.httpRequests !== false

  const isHostAllowed = (host: string | undefined) => {
    if (!config?.mcp?.enableDnsRebindingProtection) return true
    if (!host) return false
    const allowed = config?.mcp?.allowedHosts || []
    return allowed.length === 0 ? false : allowed.includes(host)
  }

  const authMiddleware = (req: any, res: any, next: any) => {
    if (!requireAuth) return next()
    const provided = (typeof req.header === 'function' ? req.header('x-api-key') : req.headers?.['x-api-key']) || req.query?.apiKey
    if (provided === apiKey) return next()
    if (apiKeys.includes(provided)) return next()
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const corsMiddleware = (req: any, res: any, next: any) => {
    const origins: string[] = config?.mcp?.corsAllowedOrigins || []
    if (!origins.length) return next()
    const origin = req.headers.origin
    if (origin && origins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, mcp-session-id, x-request-id')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
      if (req.method === 'OPTIONS') return res.status(204).end()
    }
    next()
  }

  const timingMiddleware = (req: any, res: any, next: any) => {
    if (!enableHttpLogs) return next()
    const started = Date.now()
    const requestId = (typeof req.header === 'function' ? req.header('x-request-id') : req.headers?.['x-request-id']) || randomUUID()
    res.on('finish', () => {
      const durationMs = Date.now() - started
      logger?.info?.('http.request', { requestId, method: req.method, path: req.path, status: res.statusCode, durationMs })
    })
    next()
  }

  const hostCheckMiddleware = (req: any, res: any, next: any) => {
    const host = req.headers.host as string | undefined
    if (!isHostAllowed(host)) {
      logger?.warn?.('http.host.rejected', { host })
      return res.status(403).json({ error: 'Forbidden host' })
    }
    next()
  }

  const rateLimitMiddleware = (() => {
    const rl = config?.security?.rateLimit
    if (rl?.enabled) {
      return createRateLimitMiddleware({ windowMs: rl.windowMs, max: rl.max, perIpMax: rl.perIpMax })
    }
    return (_req: any, _res: any, next: any) => next()
  })()

  // Basic health endpoint
  app.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok' })
  })

  app.post('/mcp', corsMiddleware, hostCheckMiddleware, rateLimitMiddleware, timingMiddleware, authMiddleware, async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    let transport: StreamableHTTPServerTransport

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId]
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport
        }
      })
      const server = serverFactory()
      await server.connect(transport)
      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId]
      }
    }

    await transport.handleRequest(req, res, req.body)
  })

  app.get('/mcp', corsMiddleware, hostCheckMiddleware, rateLimitMiddleware, timingMiddleware, authMiddleware, async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    const transport = sessionId ? transports[sessionId] : undefined
    if (!transport) return res.status(400).send('Invalid or missing session ID')
    await transport.handleRequest(req, res)
  })

  app.delete('/mcp', corsMiddleware, hostCheckMiddleware, rateLimitMiddleware, timingMiddleware, authMiddleware, async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    const transport = sessionId ? transports[sessionId] : undefined
    if (!transport) return res.status(400).send('Invalid or missing session ID')
    await transport.handleRequest(req, res)
  })

  app.listen(port, () => {
    console.log(`MCP HTTP server listening on :${port}`)
  })
} 