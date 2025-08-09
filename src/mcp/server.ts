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
  SchemaResourceTemplate
} from './definitions.js'

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