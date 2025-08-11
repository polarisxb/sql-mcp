import { DatabaseType } from '../types/database.js';

/**
 * 默认应用配置
 * 这些值将被环境变量和配置文件覆盖
 */
export const DEFAULT_CONFIG = {
  database: {
    type: DatabaseType.MySQL,
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: '',
    connectionTimeout: 10000,
    pool: { connectionLimit: 10, waitForConnections: true, queueLimit: 0 }
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1小时
    storage: 'memory' as const,
    maxSize: 100, // 缓存项目数
    filePath: './cache',
    prewarmOnStart: true
  },
  security: {
    readOnly: true,
    sensitiveFields: ['password', 'credit_card', 'ssn', 'token', 'secret'],
    maxQueryLength: 5000,
    sampleMaxRows: 100,
    queryTimeoutMs: 10000,
    rateLimit: { enabled: false, windowMs: 60000, max: 120, perIpMax: 60 },
    queryMaxRows: 200
  },
  logging: {
    level: 'info' as const,
    destination: 'console' as const,
    filePath: './logs/sql-mcp.log',
    slowQueryMs: 1000,
    httpRequests: true
  },
  mcp: {
    transport: 'stdio' as const,
    httpPort: 3000,
    serverName: 'sql-mcp',
    serverVersion: '1.0.0',
    httpApiKey: undefined as any,
    httpApiKeys: [],
    enableDnsRebindingProtection: false,
    allowedHosts: [],
    corsAllowedOrigins: [],
    stdioSafe: false,
    stdioCompact: false,
    outputJsonOnly: false
  }
}; 