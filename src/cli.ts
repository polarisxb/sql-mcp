#!/usr/bin/env node
import 'reflect-metadata'
import fs from 'node:fs'
import path from 'node:path'
import { start } from './index.js'

function parseArgs(argv: string[]): Record<string, string> {
  const args = argv.slice(2)
  const options: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq > -1) {
        const key = arg.substring(2, eq)
        const value = arg.substring(eq + 1)
        options[key] = value
      } else {
        const key = arg.substring(2)
        const next = args[i + 1]
        if (next && !next.startsWith('--')) {
          options[key] = next
          i++
        } else {
          options[key] = 'true'
        }
      }
    }
  }
  return options
}

function printHelp() {
  console.log(`
SQL-MCP - 数据库上下文协议服务

用法:
  sql-mcp [选项]

选项:
  --dsn <连接串>         DSN 连接字符串，如: mysql://user:pass@host:3306/dbname
  --config <文件路径>      配置文件路径
  --host <主机地址>        数据库主机
  --port <端口>           数据库端口
  --user <用户名>         数据库用户名
  --password <密码>       数据库密码
  --database <数据库名>    数据库名
  --type <数据库类型>      数据库类型 (mysql)
  --transport <传输类型>   MCP传输类型 (stdio|http)
  --httpPort <端口>       HTTP服务器端口
  --cacheEnabled <布尔值>  是否启用缓存
  --cacheTTL <秒数>       缓存过期时间
  --cacheStorage <类型>    缓存存储类型 (memory|file)
  --cachePath <路径>       文件缓存路径
  --verbose               启用详细日志 (等价于 --log-level debug)
  --log-dest <目标>        日志输出目标 (console|file)
  --log-file <路径>        日志文件路径 (当 log-dest=file 时)
  --stdio-safe            启用 stdio 安全预设（紧凑/更严上限/禁用噪音输出）
  --compact               启用紧凑输出（减少 Markdown 体积）
  --json-only             仅输出 JSON 内容
  --help, -h              显示帮助信息
`)
}

function applyDsnToEnv(dsn: string) {
  try {
    const url = new URL(dsn)
    // protocol like 'mysql:' → 'mysql'
    const protocol = url.protocol.replace(':', '').toLowerCase()
    if (protocol) process.env.SQL_MCP_DB_TYPE = protocol

    if (url.hostname) process.env.SQL_MCP_DB_HOST = url.hostname
    if (url.port) process.env.SQL_MCP_DB_PORT = url.port

    // username/password may be percent-encoded
    if (url.username) process.env.SQL_MCP_DB_USER = decodeURIComponent(url.username)
    if (url.password) process.env.SQL_MCP_DB_PASSWORD = decodeURIComponent(url.password)

    // pathname starts with '/'
    const dbName = url.pathname && url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
    if (dbName) process.env.SQL_MCP_DB_NAME = dbName

    // Note: query params are currently ignored at CLI level; future mapping can be added here
  } catch (err) {
    console.error(`无效的 DSN: ${dsn}`)
    process.exit(1)
  }
}

async function main() {
  const options = parseArgs(process.argv)

  if (options.help === 'true' || options.h === 'true') {
    printHelp()
    process.exit(0)
  }

  // 配置文件
  if (options.config) {
    const configPath = path.resolve(process.cwd(), options.config)
    if (!fs.existsSync(configPath)) {
      console.error(`配置文件不存在: ${configPath}`)
      process.exit(1)
    }
    process.env.CONFIG_FILE = configPath
  }

  // 优先使用 DSN 解析填充，再允许单项参数覆盖
  if (options.dsn) {
    applyDsnToEnv(options.dsn)
  }

  // 数据库环境变量（与 ConfigLoader 约定的 SQL_MCP_* 前缀对齐）
  if (options.host) process.env.SQL_MCP_DB_HOST = options.host
  if (options.port) process.env.SQL_MCP_DB_PORT = options.port
  if (options.user) process.env.SQL_MCP_DB_USER = options.user
  if (options.password) process.env.SQL_MCP_DB_PASSWORD = options.password
  if (options.database) process.env.SQL_MCP_DB_NAME = options.database
  if (options.type) process.env.SQL_MCP_DB_TYPE = options.type

  // 传输层
  if (options.transport) process.env.SQL_MCP_MCP_TRANSPORT = options.transport
  if (options.httpPort) process.env.SQL_MCP_MCP_HTTP_PORT = options.httpPort

  // 缓存
  if (options.cacheEnabled) process.env.SQL_MCP_CACHE_ENABLED = options.cacheEnabled
  if (options.cacheTTL) process.env.SQL_MCP_CACHE_TTL = options.cacheTTL
  if (options.cacheStorage) process.env.SQL_MCP_CACHE_STORAGE = options.cacheStorage
  if (options.cachePath) process.env.SQL_MCP_CACHE_FILE_PATH = options.cachePath

  // 日志
  if (options.verbose === 'true') process.env.SQL_MCP_LOG_LEVEL = 'debug'
  if (options['log-dest']) process.env.SQL_MCP_LOG_DESTINATION = options['log-dest']
  if (options['log-file']) process.env.SQL_MCP_LOG_FILE_PATH = options['log-file']

  // stdio 输出控制
  if (options['stdio-safe'] === 'true') process.env.SQL_MCP_MCP_STDIO_SAFE = 'true'
  if (options['compact'] === 'true') process.env.SQL_MCP_MCP_STDIO_COMPACT = 'true'
  if (options['json-only'] === 'true') process.env.SQL_MCP_OUTPUT_JSON_ONLY = 'true'

  await start()
}

main().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
}) 