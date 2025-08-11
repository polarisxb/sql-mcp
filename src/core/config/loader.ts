import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ConnectionConfig, DatabaseType } from '../types/database.js';
import { DEFAULT_CONFIG } from './defaults.js';
import { ValidatedAppConfig, validateConfig } from './schema.js';
import { deepMerge } from '../../utils/object.js';

/**
 * 应用配置接口
 * 定义应用的所有配置结构
 */
export interface AppConfig {
  database: ConnectionConfig;
  cache: {
    enabled: boolean;
    ttl: number;
    storage: 'memory' | 'file';
    maxSize: number;
    filePath?: string;
    prewarmOnStart: boolean;
  };
  security: {
    readOnly: boolean;
    sensitiveFields: string[];
    maxQueryLength: number;
    sampleMaxRows: number;
    queryTimeoutMs: number;
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      max: number;
      perIpMax: number;
    };
    queryMaxRows: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    destination: 'console' | 'file';
    filePath?: string;
    slowQueryMs?: number;
    httpRequests?: boolean;
  };
  mcp: {
    transport: 'stdio' | 'http';
    httpPort?: number;
    serverName: string;
    serverVersion: string;
    httpApiKey?: string;
    httpApiKeys?: string[];
    enableDnsRebindingProtection?: boolean;
    allowedHosts?: string[];
    corsAllowedOrigins?: string[];
    stdioSafe?: boolean;
    stdioCompact?: boolean;
    outputJsonOnly?: boolean;
  };
}

/**
 * 环境变量前缀
 * 用于识别属于应用的环境变量
 */
const ENV_PREFIX = 'SQL_MCP_';

/**
 * 配置加载器类
 * 负责从各种来源加载、合并和验证配置
 */
export class ConfigLoader {
  private config: Partial<AppConfig>;
  private envVarMap: Record<string, string>;
  
  /**
   * 配置加载器构造函数
   * @param defaultConfig 默认配置对象
   */
  constructor(private defaultConfig: Partial<AppConfig> = DEFAULT_CONFIG) {
    this.config = JSON.parse(JSON.stringify(defaultConfig)); // 深拷贝默认配置
    this.envVarMap = this.buildEnvVarMap();
  }
  
  /**
   * 从环境变量加载配置
   * 自动识别和转换与应用相关的环境变量
   */
  loadFromEnv(): this {
    // 处理所有环境变量
    for (const [envVar, configPath] of Object.entries(this.envVarMap)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setConfigValue(configPath, this.convertValueType(value, configPath));
      }
    }
    
    return this;
  }
  
  /**
   * 从配置文件加载配置
   * 支持.env、.json和.js/.cjs文件格式
   * @param filePath 配置文件路径
   */
  loadFromFile(filePath: string): this {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`Config file not found: ${filePath}`);
        return this;
      }
      
      if (filePath.endsWith('.env')) {
        const result = dotenv.config({ path: filePath });
        if (result.error) {
          throw result.error;
        }
        return this.loadFromEnv();
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      let fileConfig: Partial<AppConfig>;
      
      if (filePath.endsWith('.json')) {
        fileConfig = JSON.parse(content);
      } else if (filePath.endsWith('.js') || filePath.endsWith('.cjs')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        fileConfig = require(path.resolve(filePath));
      } else {
        throw new Error(`Unsupported config file format: ${filePath}`);
      }
      
      this.config = deepMerge(this.config, fileConfig);
    } catch (error) {
      console.error(`Failed to load config from ${filePath}:`, error);
    }
    
    return this;
  }
  
  /**
   * 获取经过验证的完整配置
   * 如果验证失败会抛出ZodError
   */
  getValidatedConfig(): ValidatedAppConfig {
    return validateConfig(this.config);
  }
  
  /**
   * 获取原始配置对象（未经验证）
   */
  getRawConfig(): Partial<AppConfig> {
    return this.config;
  }
  
  /**
   * 基于命名约定为嵌套配置路径映射环境变量
   * 例如: SQL_MCP_DB_HOST -> database.host
   */
  private buildEnvVarMap(): Record<string, string> {
    const map: Record<string, string> = {
      // 数据库配置
      [`${ENV_PREFIX}DB_TYPE`]: 'database.type',
      [`${ENV_PREFIX}DB_HOST`]: 'database.host',
      [`${ENV_PREFIX}DB_PORT`]: 'database.port',
      [`${ENV_PREFIX}DB_USER`]: 'database.user',
      [`${ENV_PREFIX}DB_PASSWORD`]: 'database.password',
      [`${ENV_PREFIX}DB_NAME`]: 'database.database',
      [`${ENV_PREFIX}DB_SSL`]: 'database.ssl',
      [`${ENV_PREFIX}DB_TIMEOUT`]: 'database.connectionTimeout',
      [`${ENV_PREFIX}DB_POOL_CONNECTION_LIMIT`]: 'database.pool.connectionLimit',
      [`${ENV_PREFIX}DB_POOL_WAIT_FOR_CONNECTIONS`]: 'database.pool.waitForConnections',
      [`${ENV_PREFIX}DB_POOL_QUEUE_LIMIT`]: 'database.pool.queueLimit',
      
      // 缓存配置
      [`${ENV_PREFIX}CACHE_ENABLED`]: 'cache.enabled',
      [`${ENV_PREFIX}CACHE_TTL`]: 'cache.ttl',
      [`${ENV_PREFIX}CACHE_STORAGE`]: 'cache.storage',
      [`${ENV_PREFIX}CACHE_MAX_SIZE`]: 'cache.maxSize',
      [`${ENV_PREFIX}CACHE_FILE_PATH`]: 'cache.filePath',
      [`${ENV_PREFIX}CACHE_PREWARM_ON_START`]: 'cache.prewarmOnStart',
      
      // 安全配置
      [`${ENV_PREFIX}SECURITY_READ_ONLY`]: 'security.readOnly',
      [`${ENV_PREFIX}SECURITY_SENSITIVE_FIELDS`]: 'security.sensitiveFields',
      [`${ENV_PREFIX}SECURITY_MAX_QUERY_LENGTH`]: 'security.maxQueryLength',
      [`${ENV_PREFIX}SECURITY_SAMPLE_MAX_ROWS`]: 'security.sampleMaxRows',
      [`${ENV_PREFIX}SECURITY_QUERY_TIMEOUT_MS`]: 'security.queryTimeoutMs',
      [`${ENV_PREFIX}SECURITY_RATE_LIMIT_ENABLED`]: 'security.rateLimit.enabled',
      [`${ENV_PREFIX}SECURITY_RATE_LIMIT_WINDOW_MS`]: 'security.rateLimit.windowMs',
      [`${ENV_PREFIX}SECURITY_RATE_LIMIT_MAX`]: 'security.rateLimit.max',
      [`${ENV_PREFIX}SECURITY_RATE_LIMIT_PER_IP_MAX`]: 'security.rateLimit.perIpMax',
      [`${ENV_PREFIX}SECURITY_QUERY_MAX_ROWS`]: 'security.queryMaxRows',
      
      // 日志配置
      [`${ENV_PREFIX}LOG_LEVEL`]: 'logging.level',
      [`${ENV_PREFIX}LOG_DESTINATION`]: 'logging.destination',
      [`${ENV_PREFIX}LOG_FILE_PATH`]: 'logging.filePath',
      [`${ENV_PREFIX}LOG_SLOW_QUERY_MS`]: 'logging.slowQueryMs',
      [`${ENV_PREFIX}LOG_HTTP_REQUESTS`]: 'logging.httpRequests',
      
      // MCP配置
      [`${ENV_PREFIX}MCP_TRANSPORT`]: 'mcp.transport',
      [`${ENV_PREFIX}MCP_HTTP_PORT`]: 'mcp.httpPort',
      [`${ENV_PREFIX}MCP_SERVER_NAME`]: 'mcp.serverName',
      [`${ENV_PREFIX}MCP_SERVER_VERSION`]: 'mcp.serverVersion',
      [`${ENV_PREFIX}MCP_HTTP_API_KEY`]: 'mcp.httpApiKey',
      [`${ENV_PREFIX}MCP_HTTP_API_KEYS`]: 'mcp.httpApiKeys',
      [`${ENV_PREFIX}MCP_ENABLE_DNS_REBINDING_PROTECTION`]: 'mcp.enableDnsRebindingProtection',
      [`${ENV_PREFIX}MCP_ALLOWED_HOSTS`]: 'mcp.allowedHosts',
      [`${ENV_PREFIX}MCP_CORS_ALLOWED_ORIGINS`]: 'mcp.corsAllowedOrigins',
      [`${ENV_PREFIX}MCP_STDIO_SAFE`]: 'mcp.stdioSafe',
      [`${ENV_PREFIX}MCP_STDIO_COMPACT`]: 'mcp.stdioCompact',
      [`${ENV_PREFIX}OUTPUT_JSON_ONLY`]: 'mcp.outputJsonOnly',
    };
    
    return map;
  }
  
  /**
   * 根据路径设置配置对象中的值
   * @param path 点分隔的配置路径 (如 'database.host')
   * @param value 要设置的值
   */
  private setConfigValue(path: string, value: any): void {
    const parts = path.split('.');
    let current: any = this.config;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * 根据配置路径自动转换环境变量值类型
   * @param value 环境变量原始字符串值
   * @param path 配置路径
   * @returns 转换后的适当类型值
   */
  private convertValueType(value: string, path: string): any {
    // 检查布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // 检查数组 (逗号分隔)
    if (path.includes('sensitiveFields')) {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    
    // 检查数字
    if (
      path.includes('.port') ||
      path.includes('ttl') ||
      path.includes('maxSize') ||
      path.includes('httpPort') ||
      path.includes('connectionTimeout') ||
      path.includes('connectionLimit') ||
      path.includes('queueLimit') ||
      path.includes('maxQueryLength') ||
      path.includes('sampleMaxRows') ||
      path.includes('queryTimeoutMs') ||
      path.includes('slowQueryMs') ||
      path.includes('windowMs') ||
      path.includes('perIpMax') ||
      path.includes('rateLimit.max') ||
      path.includes('queryMaxRows')
    ) {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    
    // 检查枚举类型
    if (path === 'database.type') {
      const dbTypeKeys = Object.values(DatabaseType);
      if (dbTypeKeys.includes(value as DatabaseType)) {
        return value;
      }
      throw new Error(`Invalid database type: ${value}`);
    }
    
    // 检查其他特定的枚举值
    if (path === 'cache.storage') {
      if (['memory', 'file'].includes(value)) {
        return value;
      }
      throw new Error(`Invalid cache storage: ${value}`);
    }
    
    if (path === 'logging.level') {
      if (['debug', 'info', 'warn', 'error'].includes(value)) {
        return value;
      }
      throw new Error(`Invalid logging level: ${value}`);
    }
    
    if (path === 'logging.destination') {
      if (['console', 'file'].includes(value)) {
        return value;
      }
      throw new Error(`Invalid logging destination: ${value}`);
    }
    
    if (path === 'mcp.transport') {
      if (['stdio', 'http'].includes(value)) {
        return value;
      }
      throw new Error(`Invalid MCP transport: ${value}`);
    }
    
    // 默认返回原始字符串值
    return value;
  }
} 