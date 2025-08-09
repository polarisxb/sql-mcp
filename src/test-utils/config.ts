import { AppConfig } from '../core/config/loader.js'
import { validateConfig, ValidatedAppConfig } from '../core/config/schema.js'

export function makeTestAppConfig(overrides: Partial<AppConfig> = {}): ValidatedAppConfig {
  const base: AppConfig = {
    database: {
      type: 'mysql' as any,
      host: 'localhost',
      port: 3306,
      user: 'test',
      password: 'test',
      database: 'test',
      connectionTimeout: 10000 as number
    },
    cache: {
      enabled: true,
      ttl: 3600,
      storage: 'memory',
      maxSize: 1000,
      filePath: null as any
    },
    security: {
      readOnly: false,
      sensitiveFields: ['password', 'token'],
      maxQueryLength: 10000
    },
    logging: {
      level: 'info',
      destination: 'console',
      filePath: ''
    },
    mcp: {
      transport: 'stdio',
      httpPort: null as any,
      serverName: 'Test Server',
      serverVersion: '1.0.0'
    }
  }

  return validateConfig(deepMerge(base, overrides) as any)
}

function deepMerge<T>(target: T, source: Partial<T>): T {
  const result: any = Array.isArray(target) ? [...(target as any)] : { ...(target as any) }
  for (const [key, value] of Object.entries(source as any)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = deepMerge((target as any)[key] ?? {}, value)
    } else {
      result[key] = value
    }
  }
  return result as T
} 