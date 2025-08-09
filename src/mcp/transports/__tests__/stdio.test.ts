import { describe, test, expect, vi } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { startStdioServer } from '../../transports/stdio.js'

class FakeServer extends McpServer {}

describe('stdio transport', () => {
  test('startStdioServer connects with StdioServerTransport', async () => {
    const server = new McpServer({ name: 't', version: '1.0.0' })
    const connectSpy = vi.spyOn(McpServer.prototype as any, 'connect').mockResolvedValueOnce(undefined)

    await startStdioServer(server)

    expect(connectSpy).toHaveBeenCalledTimes(1)
    const arg = connectSpy.mock.calls[0][0]
    // duck-typing check
    expect(arg).toBeInstanceOf(StdioServerTransport)

    connectSpy.mockRestore()
  })
}) 