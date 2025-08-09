import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

export async function startStdioServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // 保持进程常驻由 stdio 管理
  console.log('[SQL-MCP] MCP server is running (transport=stdio). Awaiting MCP client over stdio...')
} 