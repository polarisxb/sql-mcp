import { Injectable } from '../../core/di/decorators.js'
import {
  ConnectionConfig,
  TableSchema,
  Index,
  Constraint,
  Relation,
  SampleData
} from '../../core/types/database.js'
import { DatabaseConnector } from '../../core/types/connector.js'

@Injectable()
export abstract class AbstractConnector implements DatabaseConnector {
  protected config: ConnectionConfig | null = null
  protected connected = false
  
  /** 建立数据库连接 */
  abstract connect(config: ConnectionConfig): Promise<void>
  
  /** 断开数据库连接 */
  abstract disconnect(): Promise<void>
  
  /** 检查连接状态 */
  isConnected(): boolean {
    return this.connected
  }
  
  /** 测试连接 */
  abstract ping(): Promise<boolean>
  
  /** 获取所有数据库列表 */
  abstract getDatabases(): Promise<string[]>
  
  /** 获取数据库中的所有表 */
  abstract getTables(database?: string): Promise<string[]>
  
  /** 获取表结构 */
  abstract getTableSchema(tableName: string, database?: string): Promise<TableSchema>
  
  /** 获取表索引 */
  abstract getTableIndexes(tableName: string, database?: string): Promise<Index[]>
  
  /** 获取表约束 */
  abstract getTableConstraints(tableName: string, database?: string): Promise<Constraint[]>
  
  /** 获取表关系 */
  abstract getTableRelations(tableName: string, database?: string): Promise<Relation[]>
  
  /** 获取表数据样本 */
  abstract getSampleData(
    tableName: string,
    limit?: number,
    offset?: number,
    where?: string
  ): Promise<SampleData>
  
  /** 执行只读查询 */
  abstract executeReadQuery(query: string, params?: any[]): Promise<any[]>

  /** 获取只读执行计划 */
  abstract getExplainPlan(query: string): Promise<any>
  
  /** 验证连接配置 */
  protected validateConfig(config: ConnectionConfig): void {
    if (!config.host) throw new Error('Database host is required')
    if (!config.port) throw new Error('Database port is required')
    if (!config.user) throw new Error('Database user is required')
    if (config.password === undefined) throw new Error('Database password is required')
    if (!config.database) throw new Error('Database name is required')
  }
  
  /** 确保已连接 */
  protected ensureConnected(): void {
    if (!this.connected || !this.config) {
      throw new Error('Database connection not established')
    }
  }
} 