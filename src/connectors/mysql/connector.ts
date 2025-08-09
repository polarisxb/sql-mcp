import { createPool, Pool, FieldPacket, RowDataPacket, PoolOptions } from 'mysql2/promise'
import { Injectable } from '../../core/di/decorators.js'
import {
  ConnectionConfig,
  TableSchema,
  Index,
  Constraint,
  Relation,
  SampleData,
  DatabaseType
} from '../../core/types/database.js'
import { AbstractConnector } from '../base/connector.js'
import { MySQLQueryBuilder } from './query-builder.js'
import { MySQLMetadataMapper } from './metadata-mapper.js'

@Injectable()
export class MySQLConnector extends AbstractConnector {
  private pool: Pool | null = null
  private queryBuilder = new MySQLQueryBuilder()
  private metadataMapper = new MySQLMetadataMapper()
  
  async connect(config: ConnectionConfig): Promise<void> {
    this.validateConfig(config)
    if (config.type !== DatabaseType.MySQL) {
      throw new Error(`Invalid database type: ${config.type}. Expected: ${DatabaseType.MySQL}`)
    }
    try {
      this.pool = createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: (config.ssl ? {} : undefined) as PoolOptions['ssl'],
        connectTimeout: config.connectionTimeout,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      } as PoolOptions)
      // 测试连接
      const ok = await this.ping()
      if (!ok) throw new Error('Ping failed')
      this.config = config
      this.connected = true
    } catch (error) {
      throw new Error(`Failed to connect to MySQL: ${(error as Error).message}`)
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      this.connected = false
      this.config = null
    }
  }
  
  async ping(): Promise<boolean> {
    if (!this.pool) return false
    try {
      const conn = await this.pool.getConnection()
      conn.release()
      return true
    } catch {
      return false
    }
  }
  
  private async query(sql: string, params?: any[]): Promise<[any[], FieldPacket[]]> {
    this.ensureConnected()
    if (!this.pool) throw new Error('Database connection not established')
    return this.pool.query(sql, params || []) as unknown as [any[], FieldPacket[]]
  }
  
  async getDatabases(): Promise<string[]> {
    const sql = this.queryBuilder.buildGetDatabasesQuery()
    const [rows] = await this.query(sql)
    return rows.map(r => (r as any).Database)
  }
  
  async getTables(database?: string): Promise<string[]> {
    const currentDatabase = database || this.config?.database
    if (!currentDatabase) throw new Error('Database not specified')
    const sql = this.queryBuilder.buildGetTablesQuery()
    const [rows] = await this.query(sql, [currentDatabase])
    return rows.map(r => (r as any).TABLE_NAME)
  }
  
  async getTableSchema(tableName: string, database?: string): Promise<TableSchema> {
    const currentDatabase = database || this.config?.database
    if (!currentDatabase) throw new Error('Database not specified')
    const columnsQuery = this.queryBuilder.buildGetTableColumnsQuery()
    const [columnsRows] = await this.query(columnsQuery, [currentDatabase, tableName])
    const primaryKeyQuery = this.queryBuilder.buildGetPrimaryKeyQuery()
    const [primaryKeyRows] = await this.query(primaryKeyQuery, [currentDatabase, tableName])
    const tableCommentQuery = this.queryBuilder.buildGetTableCommentQuery()
    const [tableCommentRows] = await this.query(tableCommentQuery, [currentDatabase, tableName])
    const columnsRaw = this.metadataMapper.mapColumns(columnsRows as any[])
    const pkCols = this.metadataMapper.mapPrimaryKey(primaryKeyRows as any[])
    const columns = columnsRaw.map(col => ({ ...col, isPrimaryKey: pkCols.includes(col.name) }))
    const comment = (tableCommentRows as any[])[0]?.TABLE_COMMENT || ''
    const indexes = await this.getTableIndexes(tableName, currentDatabase)
    const tableSchema: TableSchema = {
      name: tableName,
      columns,
      primaryKey: pkCols.length ? pkCols : undefined,
      indexes,
      comment
    }
    return tableSchema
  }
  
  async getTableIndexes(tableName: string, database?: string): Promise<Index[]> {
    const currentDatabase = database || this.config?.database
    if (!currentDatabase) throw new Error('Database not specified')
    const sql = this.queryBuilder.buildGetIndexesQuery()
    const [rows] = await this.query(sql, [currentDatabase, tableName])
    return this.metadataMapper.mapIndexes(rows as any[])
  }
  
  async getTableConstraints(tableName: string, database?: string): Promise<Constraint[]> {
    const currentDatabase = database || this.config?.database
    if (!currentDatabase) throw new Error('Database not specified')
    const sql = this.queryBuilder.buildGetConstraintsQuery()
    const [rows] = await this.query(sql, [currentDatabase, tableName])
    return this.metadataMapper.mapConstraints(rows as any[])
  }
  
  async getTableRelations(tableName: string, database?: string): Promise<Relation[]> {
    const currentDatabase = database || this.config?.database
    if (!currentDatabase) throw new Error('Database not specified')
    const sql = this.queryBuilder.buildGetRelationsQuery()
    const [rows] = await this.query(sql, [currentDatabase, tableName, tableName])
    return this.metadataMapper.mapRelations(rows as any[])
  }
  
  async getSampleData(
    tableName: string,
    limit: number = 10,
    offset: number = 0,
    where?: string
  ): Promise<SampleData> {
    this.ensureConnected()
    const currentDatabase = this.config?.database
    if (!currentDatabase) throw new Error('Database not specified')
    const countQuery = this.queryBuilder.buildGetTableRowCountQuery(where)
    const [countRows] = await this.query(countQuery, [currentDatabase, tableName])
    const totalCount = (countRows as any[])[0]?.row_count || 0
    // 使用 mysql2 的 identifier placeholder "??" 传入 `schema.table`
    const dataQuery = this.queryBuilder.buildGetSampleDataQuery(limit, offset, where)
    const [dataRows, fields] = await this.query(dataQuery, [currentDatabase, tableName])
    const columns = fields.map(f => f.name)
    const data = (dataRows as any[]).map(row => columns.map(col => (row as any)[col]))
    return { columns, data, total: totalCount, hasMore: offset + data.length < totalCount }
  }
  
  async executeReadQuery(query: string, params?: any[]): Promise<any[]> {
    const normalized = query.trim().toLowerCase()
    if (!normalized.startsWith('select') && !normalized.startsWith('show')) {
      throw new Error('Only SELECT and SHOW queries are allowed')
    }
    const [rows] = await this.query(query, params)
    return rows as any[]
  }
} 