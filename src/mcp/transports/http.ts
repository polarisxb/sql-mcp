import express from 'express'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

export function startHttpServer(serverFactory: () => McpServer, port: number = 3000) {
  const app = express()
  app.use(express.json())

  const transports: Record<string, StreamableHTTPServerTransport> = {}

  // Basic health endpoint
  app.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok' })
  })

  app.post('/mcp', async (req: any, res: any) => {
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

  app.get('/mcp', async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    const transport = sessionId ? transports[sessionId] : undefined
    if (!transport) return res.status(400).send('Invalid or missing session ID')
    await transport.handleRequest(req, res)
  })

  app.delete('/mcp', async (req: any, res: any) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined
    const transport = sessionId ? transports[sessionId] : undefined
    if (!transport) return res.status(400).send('Invalid or missing session ID')
    await transport.handleRequest(req, res)
  })

  app.listen(port, () => {
    console.log(`[SQL-MCP] MCP server is running (transport=http) on http://127.0.0.1:${port}/mcp`)
  })
} 