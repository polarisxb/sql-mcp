import 'reflect-metadata'
import { loadConfig } from '../core/config/index.js'
import { container } from '../core/di/index.js'
import { DATABASE_CONNECTOR, METADATA_SERVICE, SAMPLER_SERVICE, SECURITY_SERVICE, CACHE_SERVICE } from '../core/di/tokens.js'
import { createCacheFromConfig } from '../core/cache/index.js'
import { MySQLConnector } from '../connectors/mysql/connector.js'
import { McpServerFactory } from './server.js'
import { TableSchemaHandler } from './handlers/table-schema.js'
import { SampleDataHandler } from './handlers/sample-data.js'
import { QueryHandler } from './handlers/query.js'
import { startStdioServer } from './transports/stdio.js'
import { startHttpServer } from './transports/http.js'

async function bootstrap() {
  const config = loadConfig()

  // 注册缓存
  const cache = createCacheFromConfig(config)
  container.registerInstance(CACHE_SERVICE, cache)

  // 注册数据库连接器实例
  const connector = new MySQLConnector()
  await connector.connect(config.database)
  container.registerInstance(DATABASE_CONNECTOR, connector)

  // 构建 MCP Server
  const metadata = container.resolve(METADATA_SERVICE)
  const sampler = container.resolve(SAMPLER_SERVICE)
  const security = container.resolve(SECURITY_SERVICE)

  const tableSchemaHandler = new TableSchemaHandler(metadata as any, security as any)
  const sampleDataHandler = new SampleDataHandler(sampler as any, security as any)
  const queryHandler = new QueryHandler(sampler as any, security as any)

  const factory = new McpServerFactory(
    metadata as any,
    sampler as any,
    security as any,
    tableSchemaHandler,
    sampleDataHandler,
    queryHandler
  )

  // 实例化 server
  const server = factory.create(config.mcp.serverName, config.mcp.serverVersion)

  // 选择传输
  if (config.mcp.transport === 'stdio') {
    await startStdioServer(server)
  } else {
    const port = config.mcp.httpPort ?? 3000
    startHttpServer(() => server, port)
  }
}

bootstrap().catch(err => {
  console.error('MCP bootstrap failed:', err)
  process.exit(1)
}) 