import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpServerFactory } from '../server.js'

function makeServices() {
  const metadataService = {
    getTables: vi.fn(async (db?: string, pattern?: string) => ['users', 'posts']),
    getTableRelations: vi.fn(async () => ([{
      constraintName: 'fk_user_post',
      sourceTable: 'posts', sourceColumns: ['user_id'],
      targetTable: 'users', targetColumns: ['id'],
      updateRule: 'CASCADE', deleteRule: 'RESTRICT'
    }])),
    getDatabases: vi.fn(async () => ['testdb'])
  } as any

  const samplerService = {
    getSampleData: vi.fn(async () => ({
      columns: ['id', 'name'],
      data: [[1, 'a']],
      total: 1,
      hasMore: false
    })),
    executeReadQuery: vi.fn(async () => ([{ a: 1 }]))
  } as any

  const securityService = {
    validateIdentifier: vi.fn(),
    validateWhereClause: vi.fn(),
    validateReadOnlyQuery: vi.fn()
  } as any

  const tableSchemaHandler = {
    handle: vi.fn(async () => ({ content: [{ type: 'text', text: '# 表: users' }] }))
  } as any
  const sampleDataHandler = {
    handle: vi.fn(async () => ({ content: [{ type: 'text', text: '# 数据样本' }] }))
  } as any
  const queryHandler = {
    handle: vi.fn(async () => ({ content: [{ type: 'text', text: '# 查询结果' }] }))
  } as any

  return { metadataService, samplerService, securityService, tableSchemaHandler, sampleDataHandler, queryHandler }
}

describe('McpServerFactory', () => {
  let spies: { tool: any; resource: any }

  beforeEach(() => {
    spies = {
      tool: vi.spyOn(McpServer.prototype as any, 'registerTool'),
      resource: vi.spyOn(McpServer.prototype as any, 'registerResource')
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('registers tools and forwards to handlers', async () => {
    const { metadataService, samplerService, securityService, tableSchemaHandler, sampleDataHandler, queryHandler } = makeServices()
    const factory = new McpServerFactory(
      metadataService,
      samplerService,
      securityService,
      tableSchemaHandler,
      sampleDataHandler,
      queryHandler
    )

    const server = factory.create('sql-mcp', '1.0.0')
    expect(server).toBeInstanceOf(McpServer)

    // 8 tools registered
    expect(spies.tool).toHaveBeenCalledTimes(8)
    const toolNames = spies.tool.mock.calls.map((c: any[]) => c[0])
    expect(toolNames).toEqual(expect.arrayContaining([
      'getTableSchema', 'listTables', 'getTableRelations', 'getSampleData', 'executeQuery',
      'searchTables', 'searchColumns', 'refreshCache'
    ]))

    // getTableSchema forwards to handler
    const schemaCall = spies.tool.mock.calls.find((c: any[]) => c[0] === 'getTableSchema')
    const schemaHandler = schemaCall[2]
    await schemaHandler({ tableName: 'users' })
    expect(tableSchemaHandler.handle).toHaveBeenCalledWith({ tableName: 'users' })

    // getSampleData forwards to handler
    const sampleCall = spies.tool.mock.calls.find((c: any[]) => c[0] === 'getSampleData')
    const sampleHandler = sampleCall[2]
    await sampleHandler({ tableName: 'users', limit: 5 })
    expect(sampleDataHandler.handle).toHaveBeenCalled()

    // executeQuery forwards to handler
    const queryCall = spies.tool.mock.calls.find((c: any[]) => c[0] === 'executeQuery')
    const execHandler = queryCall[2]
    await execHandler({ sql: 'SELECT 1' })
    expect(queryHandler.handle).toHaveBeenCalled()

    // listTables uses metadataService
    const listCall = spies.tool.mock.calls.find((c: any[]) => c[0] === 'listTables')
    const listHandler = listCall[2]
    const listRes = await listHandler({ database: 'testdb' })
    expect(metadataService.getTables).toHaveBeenCalledWith('testdb', undefined)
    expect(listRes.content[0].text).toContain('# 数据库表')

    // getTableRelations uses services
    const relCall = spies.tool.mock.calls.find((c: any[]) => c[0] === 'getTableRelations')
    const relHandler = relCall[2]
    const relRes = await relHandler({ tableName: 'posts', database: 'testdb' })
    expect(securityService.validateIdentifier).toHaveBeenCalledWith('posts')
    expect(metadataService.getTableRelations).toHaveBeenCalled()
    expect(relRes.content[0].text).toContain('| 约束名 |')
  })

  test('registers resources and read callbacks work', async () => {
    const { metadataService, samplerService, securityService, tableSchemaHandler, sampleDataHandler, queryHandler } = makeServices()
    // Customize handlers for schema resource
    tableSchemaHandler.handle.mockResolvedValueOnce({ content: [{ type: 'text', text: 'SCHEMA-TEXT' }] })

    const factory = new McpServerFactory(
      metadataService,
      samplerService,
      securityService,
      tableSchemaHandler,
      sampleDataHandler,
      queryHandler
    )
    factory.create('sql-mcp', '1.0.0')

    // 3 resources registered: database, table, schema
    expect(spies.resource).toHaveBeenCalledTimes(3)
    const resourceNames = spies.resource.mock.calls.map((c: any[]) => c[0])
    expect(resourceNames).toEqual(expect.arrayContaining(['database', 'table', 'schema']))

    // database resource read
    const dbResCall = spies.resource.mock.calls.find((c: any[]) => c[0] === 'database')
    const dbRead = dbResCall[3]
    const dbResult = await dbRead({ href: 'db://testdb' }, { database: 'testdb' })
    expect(dbResult.contents[0].text).toContain('# 数据库: testdb')

    // table resource read
    const tableResCall = spies.resource.mock.calls.find((c: any[]) => c[0] === 'table')
    const tableRead = tableResCall[3]
    const tableResult = await tableRead({ href: 'db://testdb/users' }, { database: 'testdb', table: 'users' })
    expect(tableResult.contents[0].text).toContain('## 样本数据')

    // schema resource read returns handler text
    const schemaResCall = spies.resource.mock.calls.find((c: any[]) => c[0] === 'schema')
    const schemaRead = schemaResCall[3]
    const schemaResult = await schemaRead({ href: 'schema://testdb/users' }, { database: 'testdb', table: 'users' })
    expect(schemaResult.contents[0].text).toBe('SCHEMA-TEXT')
  })
}) 