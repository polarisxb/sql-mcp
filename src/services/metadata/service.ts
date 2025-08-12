import { Injectable, Inject } from '../../core/di/decorators.js'
import { ICache } from '../../core/cache/interface.js'
import { DatabaseConnector } from '../../core/types/connector.js'
import { TableSchema, Index, Constraint, Relation } from '../../core/types/database.js'
import { IMetadataService } from './interface.js'
import { CACHE_SERVICE, DATABASE_CONNECTOR } from '../../core/di/tokens.js'

@Injectable()
export class MetadataService implements IMetadataService {
  private readonly cacheNamespace = 'metadata'
  private readonly cacheTTL = 3600
  
  private cache: ICache
  
  constructor(
    @Inject(DATABASE_CONNECTOR) private connector: DatabaseConnector,
    @Inject(CACHE_SERVICE) cache: ICache
  ) {
    this.cache = cache.withNamespace(this.cacheNamespace)
  }
  
  async getDatabases(): Promise<string[]> {
    const cacheKey = 'databases'
    const cached = await this.cache.get<string[]>(cacheKey)
    if (cached) return cached
    const databases = await this.connector.getDatabases()
    await this.cache.set(cacheKey, databases, this.cacheTTL)
    return databases
  }
  
  async getTables(database?: string, pattern?: string): Promise<string[]> {
    const cacheKey = `tables:${database || 'default'}:${pattern || '*'}`
    const cached = await this.cache.get<string[]>(cacheKey)
    if (cached) return cached
    const tables = await this.connector.getTables(database)
    let filtered = tables
    if (pattern) {
      const regex = this.likeToRegExp(pattern)
      filtered = tables.filter(t => regex.test(t))
    }
    await this.cache.set(cacheKey, filtered, this.cacheTTL)
    return filtered
  }
  
  async getTableSchema(tableName: string, database?: string): Promise<TableSchema> {
    const cacheKey = `schema:${database || 'default'}:${tableName}`
    const cached = await this.cache.get<TableSchema>(cacheKey)
    if (cached) return cached
    const schema = await this.connector.getTableSchema(tableName, database)
    await this.cache.set(cacheKey, schema, this.cacheTTL)
    return schema
  }
  
  async getTableIndexes(tableName: string, database?: string): Promise<Index[]> {
    const cacheKey = `indexes:${database || 'default'}:${tableName}`
    const cached = await this.cache.get<Index[]>(cacheKey)
    if (cached) return cached
    const indexes = await this.connector.getTableIndexes(tableName, database)
    await this.cache.set(cacheKey, indexes, this.cacheTTL)
    return indexes
  }
  
  async getTableConstraints(tableName: string, database?: string): Promise<Constraint[]> {
    const cacheKey = `constraints:${database || 'default'}:${tableName}`
    const cached = await this.cache.get<Constraint[]>(cacheKey)
    if (cached) return cached
    const constraints = await this.connector.getTableConstraints(tableName, database)
    await this.cache.set(cacheKey, constraints, this.cacheTTL)
    return constraints
  }
  
  async getTableRelations(tableName: string, database?: string): Promise<Relation[]> {
    const cacheKey = `relations:${database || 'default'}:${tableName}`
    const cached = await this.cache.get<Relation[]>(cacheKey)
    if (cached) return cached
    const relations = await this.connector.getTableRelations(tableName, database)
    await this.cache.set(cacheKey, relations, this.cacheTTL)
    return relations
  }
  
  async getDatabaseSchema(database?: string): Promise<{ tables: TableSchema[]; relations: Relation[] }> {
    const tables = await this.getTables(database)
    // 并行批量优化：表结构并发获取
    const tableSchemas = await Promise.all(tables.map(t => this.getTableSchema(t, database)))
    // 关系可并发，但按表取会有重复，取完再去重
    const relationsChunks = await Promise.all(tables.map(t => this.getTableRelations(t, database)))
    const allRelations = relationsChunks.flat()
    const uniqueRelations = this.deduplicateRelations(allRelations)
    return { tables: tableSchemas, relations: uniqueRelations }
  }
  
  async refreshCache(type: 'all' | 'table', tableName?: string, database?: string): Promise<void> {
    if (type === 'all') {
      await this.cache.clear()
      return
    }
    if (type === 'table' && tableName) {
      const db = database || 'default'
      const keys = [
        `schema:${db}:${tableName}`,
        `indexes:${db}:${tableName}`,
        `constraints:${db}:${tableName}`,
        `relations:${db}:${tableName}`
      ]
      await this.cache.deleteMany(keys)
      // 刷新表列表缓存（通配符不被大多数缓存实现支持，按常见几种模式清）
      await Promise.all([
        this.cache.delete(`tables:${db}:*`).catch(() => {}),
        this.cache.delete(`tables:${db}:%`).catch(() => {}),
        this.cache.delete(`tables:${db}:`).catch(() => {})
      ])
    }
  }
  
  private likeToRegExp(pattern: string): RegExp {
    const raw = String(pattern ?? '')
    const hasWildcards = /[%_]/.test(raw)
    const escaped = raw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    if (!hasWildcards) {
      // 无通配符时，默认按“包含”匹配，提升易用性
      return new RegExp(escaped, 'i')
    }
    const regexPattern = escaped
      .replace(/%/g, '.*')
      .replace(/_/g, '.')
    return new RegExp(regexPattern, 'i')
  }
  
  private deduplicateRelations(relations: Relation[]): Relation[] {
    const unique = new Map<string, Relation>()
    for (const r of relations) {
      const key = r.constraintName
      if (!unique.has(key)) unique.set(key, r)
    }
    return Array.from(unique.values())
  }
} 