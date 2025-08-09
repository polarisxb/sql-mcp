import { describe, test, expect, vi, beforeEach } from 'vitest'
import { TableSchemaHandler } from '../handlers/table-schema.js'
import { SampleDataHandler } from '../handlers/sample-data.js'
import { QueryHandler } from '../handlers/query.js'

const makeMetadata = () => ({
  getTableSchema: vi.fn(async () => ({
    name: 'users',
    comment: 'User table',
    columns: [
      { name: 'id', dataType: 'int', nullable: false, defaultValue: undefined, isPrimaryKey: true, isAutoIncrement: true, comment: '' },
      { name: 'name', dataType: 'varchar(255)', nullable: false, defaultValue: '', isPrimaryKey: false, isAutoIncrement: false, comment: '用户名' }
    ],
    indexes: [{ name: 'pk', columns: ['id'], isUnique: true, type: 'BTREE' }],
    constraints: []
  }))
} as any)

const makeSampler = () => ({
  getSampleData: vi.fn(async () => ({
    columns: ['id', 'name'],
    data: [[1, 'a'], [2, 'b']],
    total: 2,
    hasMore: false
  })),
  executeReadQuery: vi.fn(async () => ([{ a: 1, b: 'x' }]))
} as any)

const makeSecurity = () => ({
  validateIdentifier: vi.fn(),
  validateWhereClause: vi.fn(),
  validateReadOnlyQuery: vi.fn(),
  sanitizeSampleData: vi.fn((x: any) => x),
  sanitizeQueryResults: vi.fn((x: any) => x)
}) as any

describe('MCP handlers', () => {
  let metadata: any
  let sampler: any
  let security: any

  beforeEach(() => {
    metadata = makeMetadata()
    sampler = makeSampler()
    security = makeSecurity()
  })

  test('TableSchemaHandler formats markdown', async () => {
    const h = new TableSchemaHandler(metadata, security)
    const res = await h.handle({ tableName: 'users' })
    const text = (res.content[0] as any).text as string
    expect(text).toContain('# 表: users')
    expect(text).toContain('## 列')
    expect(text).toContain('| id | int | 否')
  })

  test('SampleDataHandler formats markdown', async () => {
    const h = new SampleDataHandler(sampler, security)
    const res = await h.handle({ tableName: 'users', limit: 5 })
    const text = (res.content[0] as any).text as string
    expect(text).toContain('# 数据样本 (共 2 行)')
    expect(text).toContain('| id | name |')
  })

  test('QueryHandler formats markdown', async () => {
    const h = new QueryHandler(sampler, security)
    const res = await h.handle({ sql: 'SELECT 1' })
    const text = (res.content[0] as any).text as string
    expect(text).toContain('# 查询结果 (1 行)')
    expect(text).toContain('| a | b |')
  })

  test('handlers return error on exception', async () => {
    metadata.getTableSchema.mockRejectedValueOnce(new Error('boom'))
    const h1 = new TableSchemaHandler(metadata, security)
    const r1 = await h1.handle({ tableName: 't' })
    expect((r1 as any).isError).toBe(true)

    sampler.getSampleData.mockRejectedValueOnce(new Error('boom'))
    const h2 = new SampleDataHandler(sampler, security)
    const r2 = await h2.handle({ tableName: 't' })
    expect((r2 as any).isError).toBe(true)

    sampler.executeReadQuery.mockRejectedValueOnce(new Error('boom'))
    const h3 = new QueryHandler(sampler, security)
    const r3 = await h3.handle({ sql: 'SELECT 1' })
    expect((r3 as any).isError).toBe(true)
  })
}) 