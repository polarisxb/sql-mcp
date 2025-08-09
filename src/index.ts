import 'reflect-metadata'
import { loadConfig } from './core/config/index.js'
import { container } from './core/di/index.js'
import { DATABASE_CONNECTOR, METADATA_SERVICE, SAMPLER_SERVICE, SECURITY_SERVICE, CACHE_SERVICE, LOGGER_SERVICE } from './core/di/tokens.js'
import { createCacheFromConfig } from './core/cache/index.js'
import { MySQLConnector } from './connectors/mysql/connector.js'
import { McpServerFactory } from './mcp/server.js'
import { TableSchemaHandler } from './mcp/handlers/table-schema.js'
import { SampleDataHandler } from './mcp/handlers/sample-data.js'
import { QueryHandler } from './mcp/handlers/query.js'
import { startStdioServer } from './mcp/transports/stdio.js'
import { startHttpServer } from './mcp/transports/http.js'
import { createLoggerFromConfig } from './utils/logging.js'

/**
 * 启动 SQL-MCP 应用
 */
export async function start(): Promise<void> {
  const configPath = process.env.CONFIG_FILE
  const config = loadConfig({ configPath, loadEnv: true })

  // 注册全局 Logger
  const appLogger = createLoggerFromConfig(config.logging)
  container.registerInstance(LOGGER_SERVICE, appLogger)
  appLogger.info('Starting SQL-MCP...', { transport: config.mcp.transport, server: config.mcp.serverName })

  // 注册缓存
  const cache = createCacheFromConfig(config)
  container.registerInstance(CACHE_SERVICE, cache)

  // 构建并注册数据库连接器
  const connector = new MySQLConnector()
  await connector.connect(config.database)
  container.registerInstance(DATABASE_CONNECTOR, connector)

  // 解析服务
  const metadata = container.resolve(METADATA_SERVICE)
  const sampler = container.resolve(SAMPLER_SERVICE)
  const security = container.resolve(SECURITY_SERVICE)

  // Handlers 与工厂
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

  const server = factory.create(config.mcp.serverName, config.mcp.serverVersion)

  // 选择传输
  if (config.mcp.transport === 'stdio') {
    await startStdioServer(server)
  } else {
    const port = config.mcp.httpPort ?? 3000
    startHttpServer(() => server, port)
  }

  // 优雅关闭
  const cleanup = async () => {
    try {
      await connector.disconnect()
      appLogger.info('SQL-MCP stopped')
    } finally {
      if (process.env.NODE_ENV !== 'test') {
        process.exit(0)
      }
    }
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
}

// 直接执行时启动（跨平台判断）
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const isMain = (() => {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : ''
  return path.resolve(__filename) === entry
})()

if (isMain) {
  start().catch(err => {
    console.error('Startup failed:', err)
    process.exit(1)
  })
}
