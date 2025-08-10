import { describe, test, expect, vi, beforeEach } from 'vitest'
import { SamplerService } from '../service.js'
import { DatabaseConnector } from '../../../core/types/connector.js'
import { ISecurityService } from '../../security/interface.js'
import { ValidatedAppConfig } from '../../../core/config/schema.js'

function makeConnector(): DatabaseConnector {
  return {
    connect: vi.fn(), disconnect: vi.fn(), isConnected: vi.fn(() => true), ping: vi.fn(async () => true),
    getDatabases: vi.fn(), getTables: vi.fn(), getTableSchema: vi.fn(), getTableIndexes: vi.fn(), getTableConstraints: vi.fn(), getTableRelations: vi.fn(),
    getSampleData: vi.fn(async () => ({ columns: ['id','password'], data: [[1,'123']], total: 1, hasMore: false })),
    executeReadQuery: vi.fn(async () => [{ id:1, token:'abc' }])
  }
}

function makeSecurity(): ISecurityService {
  return {
    validateIdentifier: vi.fn(),
    validateWhereClause: vi.fn(),
    validateReadOnlyQuery: vi.fn(),
    sanitizeSampleData: vi.fn(d => ({ ...d, data: [[1,'***REDACTED***']] })),
    sanitizeQueryResults: vi.fn((r: any[]) => r.map((x: any) => ({ ...x, token: '***REDACTED***' })))
  }
}

function makeConfig(): ValidatedAppConfig {
  return {
    database: { type: 'mysql' as any, host: 'h', port: 3306, user: 'u', password: 'p', database: 'd', connectionTimeout: 1000 },
    cache: { enabled: true, ttl: 1, storage: 'memory', maxSize: 10, filePath: './cache' },
    security: { readOnly: true, sensitiveFields: ['token', 'password'], maxQueryLength: 5000, sampleMaxRows: 100, queryTimeoutMs: 10000 },
    logging: { level: 'info', destination: 'console', filePath: './logs/sql-mcp.log' },
    mcp: { transport: 'stdio', httpPort: 3000, serverName: 't', serverVersion: '1.0.0' }
  } as any
}

describe('SamplerService', () => {
  let connector: DatabaseConnector
  let security: ISecurityService
  let svc: SamplerService

  beforeEach(() => {
    connector = makeConnector()
    security = makeSecurity()
    // @ts-ignore - direct instantiate with mocks
    svc = new SamplerService(connector, security, makeConfig())
  })

  test('getSampleData validates inputs and masks sensitive fields', async () => {
    const res = await svc.getSampleData('users', 200, 0, 'id > 0')
    expect(security.validateIdentifier).toHaveBeenCalled()
    expect(security.validateWhereClause).toHaveBeenCalled()
    // limit should be clamped to config.security.sampleMaxRows
    expect(connector.getSampleData).toHaveBeenCalledWith('users', 100, 0, 'id > 0')
    expect(res.data[0][1]).toBe('***REDACTED***')
  })

  test('executeReadQuery validates readonly and masks results', async () => {
    const rows = await svc.executeReadQuery('select * from users where id = ?', [1])
    expect(security.validateReadOnlyQuery).toHaveBeenCalled()
    expect(rows[0].token).toBe('***REDACTED***')
  })
}) 