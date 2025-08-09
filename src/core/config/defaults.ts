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
    connectionTimeout: 10000
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1小时
    storage: 'memory' as const,
    maxSize: 100, // 缓存项目数
    filePath: './cache'
  },
  security: {
    readOnly: true,
    sensitiveFields: ['password', 'credit_card', 'ssn', 'token', 'secret'],
    maxQueryLength: 5000
  },
  logging: {
    level: 'info' as const,
    destination: 'console' as const,
    filePath: './logs/sql-mcp.log'
  },
  mcp: {
    transport: 'stdio' as const,
    httpPort: 3000,
    serverName: 'sql-mcp',
    serverVersion: '1.0.0'
  }
}; 