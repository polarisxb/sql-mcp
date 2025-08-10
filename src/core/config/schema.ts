import { z } from 'zod';
import { DatabaseType } from '../types/database.js';

/**
 * 数据库配置Schema
 * 验证数据库连接相关配置
 */
export const DatabaseConfigSchema = z.object({
  type: z.nativeEnum(DatabaseType),
  host: z.string().default('localhost'),
  port: z.number().int().positive().default(3306),
  user: z.string(),
  password: z.string(),
  database: z.string(),
  ssl: z.boolean().optional(),
  connectionTimeout: z.number().int().positive().optional().default(10000),
  pool: z.object({
    connectionLimit: z.number().int().positive().default(10),
    waitForConnections: z.boolean().default(true),
    queueLimit: z.number().int().nonnegative().default(0)
  }).default({})
});

/**
 * 缓存配置Schema
 * 验证缓存相关配置
 */
export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().int().positive().default(3600),
  storage: z.enum(['memory', 'file']).default('memory'),
  maxSize: z.number().int().positive().default(100),
  filePath: z.string().nullable().optional().default('./cache')
}).refine(data => {
  // 如果存储类型是file，则filePath必须存在且不为null
  return !(data.storage === 'file' && (!data.filePath || data.filePath === null));
}, {
  message: "filePath is required when storage type is 'file'",
  path: ['filePath']
});

/**
 * 安全配置Schema
 * 验证安全相关配置
 */
export const SecurityConfigSchema = z.object({
  readOnly: z.boolean().default(true),
  sensitiveFields: z.array(z.string()).default(['password', 'credit_card', 'ssn', 'token', 'secret']),
  maxQueryLength: z.number().int().positive().default(5000),
  sampleMaxRows: z.number().int().positive().default(100),
  queryTimeoutMs: z.number().int().positive().default(10000),
  rateLimit: z.object({
    enabled: z.boolean().default(false),
    windowMs: z.number().int().positive().default(60000),
    max: z.number().int().positive().default(120),
    perIpMax: z.number().int().positive().default(60)
  }).default({})
});

/**
 * 日志配置Schema
 * 验证日志相关配置
 */
export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  destination: z.enum(['console', 'file']).default('console'),
  filePath: z.string().optional().default('./logs/sql-mcp.log'),
  slowQueryMs: z.number().int().positive().default(1000),
  httpRequests: z.boolean().default(true)
}).refine(data => {
  return !(data.destination === 'file' && !data.filePath);
}, {
  message: "filePath is required when log destination is 'file'",
  path: ['filePath']
});

/**
 * MCP配置Schema
 * 验证MCP协议相关配置
 */
export const McpConfigSchema = z.object({
  transport: z.enum(['stdio', 'http']).default('stdio'),
  httpPort: z.number().int().positive().nullable().optional().default(3000),
  serverName: z.string().default('sql-mcp'),
  serverVersion: z.string().default('1.0.0'),
  httpApiKey: z.string().optional(),
  httpApiKeys: z.array(z.string()).default([]),
  enableDnsRebindingProtection: z.boolean().default(false),
  allowedHosts: z.array(z.string()).default([]),
  corsAllowedOrigins: z.array(z.string()).default([])
}).refine(data => {
  return !(data.transport === 'http' && (!data.httpPort || data.httpPort === null));
}, {
  message: "httpPort is required when transport is 'http'",
  path: ['httpPort']
});

/**
 * 应用配置Schema
 * 整合所有配置Schema
 */
export const AppConfigSchema = z.object({
  database: DatabaseConfigSchema,
  cache: CacheConfigSchema.default({}),
  security: SecurityConfigSchema.default({}),
  logging: LoggingConfigSchema.default({}),
  mcp: McpConfigSchema.default({})
});

/**
 * 导出经过Zod验证的应用配置类型
 */
export type ValidatedAppConfig = z.infer<typeof AppConfigSchema>;

/**
 * 验证配置对象是否符合Schema要求
 * @param config 待验证的配置对象
 * @returns 验证后的配置对象
 * @throws 如果验证失败则抛出ZodError
 */
export function validateConfig(config: unknown): ValidatedAppConfig {
  return AppConfigSchema.parse(config);
} 