import { describe, test, expect, vi, beforeEach } from 'vitest'
import { MetadataService } from '../service.js'
import { ICache } from '../../../core/cache/interface.js'
import { DatabaseConnector } from '../../../core/types/connector.js'

function makeCache(): ICache {
  const store = new Map<string, any>()
  const ns = 'metadata:'
  const api: ICache = {
    withNamespace: (n: string) => api,
    get: vi.fn(async (k: string) => store.get(k)),
    set: vi.fn(async (k: string, v: any) => { store.set(k, v) }),
    has: vi.fn(async (k: string) => store.has(k)),
    delete: vi.fn(async (k: string) => { store.delete(k) ; return true }),
    deleteMany: vi.fn(async (keys: string[]) => { keys.forEach(k => store.delete(k)) }),
    clear: vi.fn(async () => { store.clear() }),
    getStats: vi.fn(async () => ({ hits: 0, misses: 0, size: store.size, keys: Array.from(store.keys()) }))
  } as any
  return api
}

function makeConnector(): DatabaseConnector {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => true),
    ping: vi.fn(async () => true),
    getDatabases: vi.fn(async () => ['db1', 'db2']),
    getTables: vi.fn(async () => ['t1', 't2', 'user_accounts']),
    getTableSchema: vi.fn(async (t: string) => ({ name: t, columns: [], comment: '' } as any)),
    getTableIndexes: vi.fn(async () => []),
    getTableConstraints: vi.fn(async () => []),
    getTableRelations: vi.fn(async () => []),
    getSampleData: vi.fn(),
    executeReadQuery: vi.fn()
  }
}

describe('MetadataService', () => {
  let cache: ICache
  let connector: DatabaseConnector
  let svc: MetadataService

  beforeEach(() => {
    cache = makeCache()
    connector = makeConnector()
    svc = new MetadataService(connector, cache)
  })

  test('getDatabases uses cache', async () => {
    const first = await svc.getDatabases()
    expect(first).toEqual(['db1', 'db2'])
    ;(connector.getDatabases as any).mockResolvedValue(['x'])
    const second = await svc.getDatabases()
    expect(second).toEqual(['db1', 'db2'])
  })

  test('getTables supports pattern filter', async () => {
    const all = await svc.getTables('db1')
    expect(all).toEqual(['t1', 't2', 'user_accounts'])
    const filtered = await svc.getTables('db1', 'user%')
    expect(filtered).toEqual(['user_accounts'])
  })

  test('getDatabaseSchema batches in parallel and dedup relations', async () => {
    ;(connector.getTables as any).mockResolvedValue(['a', 'b'])
    ;(connector.getTableRelations as any).mockResolvedValueOnce([{ constraintName: 'fk1' }]).mockResolvedValueOnce([{ constraintName: 'fk1' }])
    const res = await svc.getDatabaseSchema('db1')
    expect(res.tables.length).toBe(2)
    expect(res.relations.length).toBe(1)
  })

  test('refreshCache clears table entries', async () => {
    await cache.set('schema:default:foo', {}, 1)
    await cache.set('indexes:default:foo', {}, 1)
    await svc.refreshCache('table', 'foo')
    expect(await cache.get('schema:default:foo')).toBeUndefined()
  })
}) 