import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigLoader, AppConfig } from '../loader.js';
import { validateConfig } from '../schema.js';
import { DEFAULT_CONFIG } from '../defaults.js';
import { DatabaseType } from '../../types/database.js';

// 创建临时文件的辅助函数
function createTempFile(content: string, extension: string): string {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `config-test-${Date.now()}${extension}`);
  fs.writeFileSync(tempFile, content);
  return tempFile;
}

describe('ConfigLoader', () => {
  // 每个测试后清理环境变量
  const originalEnv = { ...process.env };
  
  afterEach(() => {
    process.env = { ...originalEnv };
  });
  
  test('should load default config', () => {
    const loader = new ConfigLoader(DEFAULT_CONFIG);
    const config = loader.getRawConfig();
    
    expect(config).toEqual(DEFAULT_CONFIG);
  });
  
  test('should load config from environment variables', () => {
    // 设置测试环境变量
    process.env.SQL_MCP_DB_HOST = 'test-host';
    process.env.SQL_MCP_DB_PORT = '5432';
    process.env.SQL_MCP_CACHE_ENABLED = 'false';
    process.env.SQL_MCP_SECURITY_SENSITIVE_FIELDS = 'password,token,api_key';
    
    const loader = new ConfigLoader(DEFAULT_CONFIG);
    loader.loadFromEnv();
    const config = loader.getRawConfig();
    
    expect(config.database?.host).toBe('test-host');
    expect(config.database?.port).toBe(5432);
    expect(config.cache?.enabled).toBe(false);
    expect(config.security?.sensitiveFields).toEqual(['password', 'token', 'api_key']);
  });
  
  test('should load config from JSON file', () => {
    const jsonConfig = {
      database: {
        host: 'json-host',
        port: 1234
      },
      mcp: {
        serverName: 'json-server'
      }
    };
    
    const tempFile = createTempFile(JSON.stringify(jsonConfig), '.json');
    
    try {
      const loader = new ConfigLoader(DEFAULT_CONFIG);
      loader.loadFromFile(tempFile);
      const config = loader.getRawConfig();
      
      expect(config.database?.host).toBe('json-host');
      expect(config.database?.port).toBe(1234);
      expect(config.mcp?.serverName).toBe('json-server');
      
      // 确认其他默认值保持不变
      expect(config.database?.type).toBe(DEFAULT_CONFIG.database.type);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });
  
  test('should load config from JS file', () => {
    const jsConfig = `
      module.exports = {
        database: {
          host: 'js-host',
          port: 5678
        },
        logging: {
          level: 'debug'
        }
      };
    `;
    
    const tempFile = createTempFile(jsConfig, '.js');
    
    try {
      const loader = new ConfigLoader(DEFAULT_CONFIG);
      loader.loadFromFile(tempFile);
      const config = loader.getRawConfig();
      
      expect(config.database?.host).toBe('js-host');
      expect(config.database?.port).toBe(5678);
      expect(config.logging?.level).toBe('debug');
    } finally {
      fs.unlinkSync(tempFile);
    }
  });
  
  test('should load config from .env file', () => {
    const envContent = `
      SQL_MCP_DB_HOST=env-host
      SQL_MCP_DB_PORT=9999
      SQL_MCP_CACHE_TTL=7200
    `;
    
    const tempFile = createTempFile(envContent, '.env');
    
    try {
      const loader = new ConfigLoader(DEFAULT_CONFIG);
      loader.loadFromFile(tempFile);
      const config = loader.getRawConfig();
      
      expect(config.database?.host).toBe('env-host');
      expect(config.database?.port).toBe(9999);
      expect(config.cache?.ttl).toBe(7200);
    } finally {
      fs.unlinkSync(tempFile);
    }
  });
  
  test('should merge configs in correct order', () => {
    // 设置环境变量
    process.env.SQL_MCP_DB_HOST = 'env-host';
    process.env.SQL_MCP_CACHE_TTL = '1000';
    
    // 创建JSON配置文件
    const jsonConfig = {
      database: {
        host: 'json-host',
        port: 1234
      },
      cache: {
        enabled: false
      }
    };
    
    const tempFile = createTempFile(JSON.stringify(jsonConfig), '.json');
    
    try {
      const loader = new ConfigLoader(DEFAULT_CONFIG);
      
      // 先加载文件，再加载环境变量
      loader.loadFromFile(tempFile);
      loader.loadFromEnv();
      
      const config = loader.getRawConfig();
      
      // 环境变量应该覆盖JSON文件的配置
      expect(config.database?.host).toBe('env-host'); // 来自环境变量
      expect(config.database?.port).toBe(1234); // 来自JSON文件
      expect(config.cache?.enabled).toBe(false); // 来自JSON文件
      expect(config.cache?.ttl).toBe(1000); // 来自环境变量
    } finally {
      fs.unlinkSync(tempFile);
    }
  });
  
  test('should validate config correctly', () => {
    const validConfig: AppConfig = {
      database: {
        type: DatabaseType.MySQL as const,
        host: 'localhost',
        port: 3306,
        user: 'user',
        password: 'pass',
        database: 'db'
      },
      cache: {
        enabled: true,
        ttl: 3600,
        storage: 'memory' as const,
        maxSize: 100
      },
      security: {
        readOnly: true,
        sensitiveFields: ['password'],
        maxQueryLength: 1000
      },
      logging: {
        level: 'info' as const,
        destination: 'console' as const
      },
      mcp: {
        transport: 'stdio' as const,
        serverName: 'test',
        serverVersion: '1.0'
      }
    };
    
    // 验证有效配置
    expect(() => validateConfig(validConfig)).not.toThrow();
    
    // 验证无效配置
    const invalidConfig = {
      ...validConfig,
      database: {
        ...validConfig.database,
        port: -1 // 无效端口
      }
    };
    
    expect(() => validateConfig(invalidConfig)).toThrow();
  });
  
  test('should handle schema refinements', () => {
    // 测试file存储需要filePath
    const invalidCacheConfig = {
      database: {
        type: DatabaseType.MySQL,
        host: 'localhost',
        port: 3306,
        user: 'user',
        password: 'pass',
        database: 'db'
      },
      cache: {
        enabled: true,
        ttl: 3600,
        storage: 'file' as const,
        maxSize: 100,
        filePath: null // 显式设置为null而不是undefined
      }
    };
    
    expect(() => validateConfig(invalidCacheConfig)).toThrow(/filePath is required/);
    
    // 测试http传输需要httpPort
    const invalidMcpConfig = {
      database: {
        type: DatabaseType.MySQL,
        host: 'localhost',
        port: 3306,
        user: 'user',
        password: 'pass',
        database: 'db'
      },
      mcp: {
        transport: 'http' as const,
        httpPort: null, // 显式设置为null而不是undefined
        serverName: 'test',
        serverVersion: '1.0'
      }
    };
    
    expect(() => validateConfig(invalidMcpConfig)).toThrow(/httpPort is required/);
  });
}); 