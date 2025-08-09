import { TableSchema, Index, Constraint, Relation } from '../../core/types/database.js'

export interface IMetadataService {
  getDatabases(): Promise<string[]>
  getTables(database?: string, pattern?: string): Promise<string[]>
  getTableSchema(tableName: string, database?: string): Promise<TableSchema>
  getTableIndexes(tableName: string, database?: string): Promise<Index[]>
  getTableConstraints(tableName: string, database?: string): Promise<Constraint[]>
  getTableRelations(tableName: string, database?: string): Promise<Relation[]>
  getDatabaseSchema(database?: string): Promise<{ tables: TableSchema[]; relations: Relation[] }>
  refreshCache(type: 'all' | 'table', tableName?: string, database?: string): Promise<void>
} 