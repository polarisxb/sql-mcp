import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Injectable } from '../core/di/decorators.js'
import { IMetadataService } from '../services/metadata/interface.js'
import { ISamplerService } from '../services/sampler/interface.js'
import { ISecurityService } from '../services/security/interface.js'
import { TableSchemaHandler } from './handlers/table-schema.js'
import { SampleDataHandler } from './handlers/sample-data.js'
import { QueryHandler } from './handlers/query.js'
import {
  TableSchemaToolSchema,
  ListTablesToolSchema,
  TableRelationsToolSchema,
  SampleDataToolSchema,
  ExecuteQueryToolSchema,
  DatabaseResourceTemplate,
  TableResourceTemplate,
  SchemaResourceTemplate,
  SearchTablesToolSchema,
  SearchColumnsToolSchema,
  RefreshCacheToolSchema,
  ExplainQueryToolSchema,
  OptimizeQueryToolSchema,
  GenerateExamplesToolSchema,
  FixQueryToolSchema,
  IndexAdvisorToolSchema,
  RewriteQueryToolSchema,
  DoctorToolSchema
} from './definitions.js'
import { SqlTutorHandler } from './handlers/sql-tutor.js'

@Injectable()
export class McpServerFactory {
  constructor(
    private metadataService: IMetadataService,
    private samplerService: ISamplerService,
    private securityService: ISecurityService,
    private tableSchemaHandler: TableSchemaHandler,
    private sampleDataHandler: SampleDataHandler,
    private queryHandler: QueryHandler
  ) {}
  
  create(name = 'sql-mcp', version = '1.0.0'): McpServer {
    const server = new McpServer({ name, version })
    this.registerTools(server)
    this.registerResources(server)
    return server
  }

  private textResult(text: string) {
    return { content: [{ type: 'text' as const, text }] }
  }
  private errorResult(message: string) {
    return { content: [{ type: 'text' as const, text: message }], isError: true as const }
  }
  
  private registerTools(server: McpServer): void {
    server.registerTool(
      TableSchemaToolSchema.name,
      {
        title: TableSchemaToolSchema.title,
        description: TableSchemaToolSchema.description,
        inputSchema: TableSchemaToolSchema.inputSchema
      },
      async (params) => this.tableSchemaHandler.handle(params) as any
    )
    
    server.registerTool(
      ListTablesToolSchema.name,
      {
        title: ListTablesToolSchema.title,
        description: ListTablesToolSchema.description,
        inputSchema: ListTablesToolSchema.inputSchema
      },
      async ({ database, pattern }) => {
        try {
          const tables = await this.metadataService.getTables(database, pattern)
          return this.textResult(`# 数据库表\n\n${tables.map(t => `- ${t}`).join('\n')}`)
        } catch (error) {
          return this.errorResult(`Error: ${(error as Error).message}`)
        }
      }
    )

    // searchTables (alias with required pattern)
    server.registerTool(
      SearchTablesToolSchema.name,
      {
        title: SearchTablesToolSchema.title,
        description: SearchTablesToolSchema.description,
        inputSchema: SearchTablesToolSchema.inputSchema
      },
      async ({ database, pattern }) => {
        try {
          const tables = await this.metadataService.getTables(database, pattern)
          if (!tables.length) return this.textResult('未找到匹配的表。')
          return this.textResult(`# 匹配的表\n\n${tables.map((t: string) => `- ${t}`).join('\n')}`)
        } catch (error) {
          return this.errorResult(`Error: ${(error as Error).message}`)
        }
      }
    )

    // searchColumns by scanning schemas
    server.registerTool(
      SearchColumnsToolSchema.name,
      {
        title: SearchColumnsToolSchema.title,
        description: SearchColumnsToolSchema.description,
        inputSchema: SearchColumnsToolSchema.inputSchema
      },
      async ({ database, pattern }) => {
        try {
          const tables = await this.metadataService.getTables(database)
          if (!tables.length) return this.textResult('没有可检索的表。')
          const regex = new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.'), 'i')
          const rows: string[] = []
          for (const tbl of tables) {
            const schema = await this.metadataService.getTableSchema(tbl, database)
            for (const col of schema.columns) {
              const candidates = [col.name, col.dataType, col.comment || '']
              if (candidates.some(v => regex.test(String(v)) || (!/[%_]/.test(pattern) && String(v).toLowerCase().includes(String(pattern).toLowerCase())))) {
                rows.push(`| ${tbl} | ${col.name} | ${col.dataType} | ${col.comment || ''} |`)
              }
            }
          }
          if (!rows.length) return this.textResult('未找到匹配的列。')
          const header = ['# 匹配的列', '', '| 表 | 列 | 类型 | 备注 |', '|----|----|------|------|']
          return this.textResult(header.concat(rows).join('\n'))
        } catch (error) {
          return this.errorResult(`Error: ${(error as Error).message}`)
        }
      }
    )

    // refreshCache tool
    server.registerTool(
      RefreshCacheToolSchema.name,
      {
        title: RefreshCacheToolSchema.title,
        description: RefreshCacheToolSchema.description,
        inputSchema: RefreshCacheToolSchema.inputSchema
      },
      async ({ scope, tableName, database }) => {
        try {
          if (scope === 'table' && !tableName) {
            return this.errorResult('当 scope=table 时，必须提供 tableName。')
          }
          await this.metadataService.refreshCache(scope, tableName, database)
          return this.textResult('缓存刷新成功。')
        } catch (error) {
          return this.errorResult(`Error: ${(error as Error).message}`)
        }
      }
    )

    server.registerTool(
      TableRelationsToolSchema.name,
      {
        title: TableRelationsToolSchema.title,
        description: TableRelationsToolSchema.description,
        inputSchema: TableRelationsToolSchema.inputSchema
      },
      async ({ tableName, database }) => {
        try {
          this.securityService.validateIdentifier(tableName)
          if (database) this.securityService.validateIdentifier(database)
          const relations = await this.metadataService.getTableRelations(tableName, database)
          if (!relations.length) {
            return this.textResult(`表 ${tableName} 没有与其他表的关系。`)
          }
          const lines = ['# 表关系', '']
          lines.push('| 约束名 | 源表 | 源列 | 目标表 | 目标列 | 更新规则 | 删除规则 |')
          lines.push('|--------|------|------|-------|-------|----------|----------|')
          for (const rel of relations) {
            lines.push(`| ${rel.constraintName} | ${rel.sourceTable} | ${rel.sourceColumns.join(', ')} | ${rel.targetTable} | ${rel.targetColumns.join(', ')} | ${rel.updateRule} | ${rel.deleteRule} |`)
          }
          return this.textResult(lines.join('\n'))
        } catch (error) {
          return this.errorResult(`Error: ${(error as Error).message}`)
        }
      }
    )
    
    server.registerTool(
      SampleDataToolSchema.name,
      {
        title: SampleDataToolSchema.title,
        description: SampleDataToolSchema.description,
        inputSchema: SampleDataToolSchema.inputSchema
      },
      async (params) => this.sampleDataHandler.handle(params) as any
    )
    
    server.registerTool(
      ExecuteQueryToolSchema.name,
      {
        title: ExecuteQueryToolSchema.title,
        description: ExecuteQueryToolSchema.description,
        inputSchema: ExecuteQueryToolSchema.inputSchema
      },
      async (params) => this.queryHandler.handle(params) as any
    )

    // SQL 导师工具
    const tutor = new SqlTutorHandler(this.securityService)

    server.registerTool(
      ExplainQueryToolSchema.name,
      { title: ExplainQueryToolSchema.title, description: ExplainQueryToolSchema.description, inputSchema: ExplainQueryToolSchema.inputSchema },
      async (params) => tutor.explain(params) as any
    )

    server.registerTool(
      OptimizeQueryToolSchema.name,
      { title: OptimizeQueryToolSchema.title, description: OptimizeQueryToolSchema.description, inputSchema: OptimizeQueryToolSchema.inputSchema },
      async (params) => tutor.optimize(params) as any
    )

    server.registerTool(
      GenerateExamplesToolSchema.name,
      { title: GenerateExamplesToolSchema.title, description: GenerateExamplesToolSchema.description, inputSchema: GenerateExamplesToolSchema.inputSchema },
      async (params) => tutor.generateExamples(params) as any
    )

    server.registerTool(
      FixQueryToolSchema.name,
      { title: FixQueryToolSchema.title, description: FixQueryToolSchema.description, inputSchema: FixQueryToolSchema.inputSchema },
      async (params) => tutor.fix(params) as any
    )

    // 专用：索引建议
    server.registerTool(
      IndexAdvisorToolSchema.name,
      { title: IndexAdvisorToolSchema.title, description: IndexAdvisorToolSchema.description, inputSchema: IndexAdvisorToolSchema.inputSchema },
      async ({ sql }) => {
        this.securityService.validateReadOnlyQuery(sql)
        const plan = await (async () => {
          try { const connector: any = (await import('../core/di/index.js')).container.resolve((await import('../core/di/tokens.js')).DATABASE_CONNECTOR); return connector?.getExplainPlan ? await connector.getExplainPlan(sql) : {} } catch { return {} }
        })()
        const analysis = new (await import('../core/advisor/plan-analyzer.js')).PlanAnalyzer().analyze(plan)
        const shape = (this as any).analyzeSqlShape ? (this as any).analyzeSqlShape(sql) : { tables:[], joins:[], filters:[], selectAll:false, joinKeys:[] }
        const suggestions = new (await import('../core/advisor/index-advisor.js')).IndexAdvisor().advise(analysis as any, shape as any)
        const payload = { plan, analysis, suggestions }
        return { content: [{ type: 'text', text: `# 索引建议\n\n${suggestions.map((s: any) => `- [${s.level}] ${s.action} —— ${s.reason}`).join('\n') || '暂无建议'}` }, { type: 'resource', resource: { uri: 'memory://advisor-evidence.json', mimeType: 'application/json', text: JSON.stringify(payload) } }] }
      }
    )

    // 专用：查询改写
    server.registerTool(
      RewriteQueryToolSchema.name,
      { title: RewriteQueryToolSchema.title, description: RewriteQueryToolSchema.description, inputSchema: RewriteQueryToolSchema.inputSchema },
      async ({ sql }) => {
        this.securityService.validateReadOnlyQuery(sql)
        const rewrites = new (await import('../core/advisor/query-rewriter.js')).QueryRewriter().rewrite(sql)
        const text = ['# 查询改写', ''].concat(rewrites.flatMap((r: any) => r.sql ? [`- ${r.description}`, '```sql', r.sql, '```'] : [`- ${r.description}`])).join('\n') || '# 查询改写\n\n暂无改写建议'
        const payload = { rewrites }
        return { content: [{ type: 'text', text }, { type: 'resource', resource: { uri: 'memory://advisor-evidence.json', mimeType: 'application/json', text: JSON.stringify(payload) } }] }
      }
    )

    // Doctor 自检
    server.registerTool(
      DoctorToolSchema.name,
      { title: DoctorToolSchema.title, description: DoctorToolSchema.description, inputSchema: DoctorToolSchema.inputSchema },
      async () => {
        const { runDoctor } = await import('../tools/doctor.js')
        const res = await runDoctor()
        return {
          content: [
            { type: 'text', text: res.text },
            { type: 'resource', resource: { uri: 'memory://doctor.json', mimeType: 'application/json', text: JSON.stringify(res.evidence) } }
          ]
        }
      }
    )
  }
  
  private registerResources(server: McpServer): void {
    server.registerResource(
      'database',
      new ResourceTemplate(DatabaseResourceTemplate, {
        list: undefined,
        complete: {
          database: async (value: unknown) => {
            const v = Array.isArray(value) ? (value[0] ?? '') : String(value ?? '')
            const databases = await this.metadataService.getDatabases()
            return databases.filter(db => db.startsWith(v))
          }
        }
      }),
      { title: '数据库', description: '数据库信息' },
      async (uri, { database }: { database?: string }) => {
        const tables = await this.metadataService.getTables(database)
        return {
          contents: [{ uri: uri.href, text: `# 数据库: ${database}\n\n## 表\n\n${tables.map(t => `- ${t}`).join('\n')}` }]
        }
      }
    )
    
    server.registerResource(
      'table',
      new ResourceTemplate(TableResourceTemplate, {
        list: undefined,
        complete: {
          database: async (value: unknown) => {
            const v = Array.isArray(value) ? (value[0] ?? '') : String(value ?? '')
            const databases = await this.metadataService.getDatabases()
            return databases.filter(db => db.startsWith(v))
          },
          table: async (value: unknown, context: any) => {
            const v = Array.isArray(value) ? (value[0] ?? '') : String(value ?? '')
            if (!context?.arguments?.database) return []
            const tables = await this.metadataService.getTables(context.arguments.database)
            return tables.filter((t: string) => t.startsWith(v))
          }
        }
      }),
      { title: '数据库表', description: '数据库表信息' },
      async (uri, variables: any) => {
        const dbVar = variables?.database
        const tblVar = variables?.table
        const db = Array.isArray(dbVar) ? (dbVar[0] ?? undefined) : dbVar
        const tbl = Array.isArray(tblVar) ? (tblVar[0] ?? '') : String(tblVar)
        const sampleData = await this.samplerService.getSampleData(tbl, 5, 0)
        const lines = [`# 表: ${tbl}`, '', '## 样本数据', '']
        lines.push(`| ${sampleData.columns.join(' | ')} |`)
        lines.push(`| ${sampleData.columns.map(() => '----').join(' | ')} |`)
        for (const row of sampleData.data) {
          const formattedRow = row.map(cell => {
            if (cell === null || cell === undefined) return 'NULL'
            if (typeof cell === 'object') return JSON.stringify(cell)
            return String(cell)
          })
          lines.push(`| ${formattedRow.join(' | ')} |`)
        }
        return { contents: [{ uri: uri.href, text: lines.join('\n') }] }
      }
    )
    
    server.registerResource(
      'schema',
      new ResourceTemplate(SchemaResourceTemplate, {
        list: undefined,
        complete: {
          database: async (value: unknown) => {
            const v = Array.isArray(value) ? (value[0] ?? '') : String(value ?? '')
            const databases = await this.metadataService.getDatabases()
            return databases.filter(db => db.startsWith(v))
          },
          table: async (value: unknown, context: any) => {
            const v = Array.isArray(value) ? (value[0] ?? '') : String(value ?? '')
            if (!context?.arguments?.database) return []
            const tables = await this.metadataService.getTables(context.arguments.database)
            return tables.filter((t: string) => t.startsWith(v))
          }
        }
      }),
      { title: '表结构', description: '数据库表结构' },
      async (uri, variables: any) => {
        const dbVar = variables?.database
        const tblVar = variables?.table
        const db = Array.isArray(dbVar) ? (dbVar[0] ?? undefined) : dbVar
        const tbl = Array.isArray(tblVar) ? (tblVar[0] ?? '') : String(tblVar)
        const res = await this.tableSchemaHandler.handle({ tableName: tbl, database: db })
        const text = (res.content[0] as any).text as string
        return { contents: [{ uri: uri.href, text }] }
      }
    )
  }
} 