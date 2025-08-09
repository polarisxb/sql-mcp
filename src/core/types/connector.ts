import { ConnectionConfig, TableSchema, Index, Constraint, Relation, SampleData } from './database.js';

/**
 * 数据库连接器的核心接口，定义了与数据库交互的标准方法。
 * 任何具体的数据库驱动（如MySQL, PostgreSQL）都应实现此接口。
 */
export interface DatabaseConnector {
  /**
   * 使用提供的配置建立数据库连接。
   * @param config - 数据库连接配置
   * @returns {Promise<void>} 连接成功时解析的Promise
   */
  connect(config: ConnectionConfig): Promise<void>;

  /**
   * 断开与数据库的连接。
   * @returns {Promise<void>} 断开连接成功时解析的Promise
   */
  disconnect(): Promise<void>;

  /**
   * 检查当前是否已连接到数据库。
   * @returns {boolean} 如果已连接则返回true，否则返回false
   */
  isConnected(): boolean;

  /**
   * 测试与数据库的连接是否仍然活动。
   * @returns {Promise<boolean>} 连接活动时返回true，否则返回false
   */
  ping(): Promise<boolean>;
  
  /**
   * 获取所有数据库/模式的列表。
   * @returns {Promise<string[]>} 数据库名称字符串数组
   */
  getDatabases(): Promise<string[]>;

  /**
   * 获取指定数据库中的所有表的列表。
   * @param database - (可选) 目标数据库名称，不提供则使用连接配置中的默认库
   * @returns {Promise<string[]>} 表名称字符串数组
   */
  getTables(database?: string): Promise<string[]>;

  /**
   * 获取指定表的完整结构信息。
   * @param tableName - 目标表名
   * @param database - (可选) 目标数据库名称
   * @returns {Promise<TableSchema>} 表的结构信息
   */
  getTableSchema(tableName: string, database?: string): Promise<TableSchema>;

  /**
   * 获取指定表的所有索引信息。
   * @param tableName - 目标表名
   * @param database - (可选) 目标数据库名称
   * @returns {Promise<Index[]>} 索引信息数组
   */
  getTableIndexes(tableName: string, database?: string): Promise<Index[]>;

  /**
   * 获取指定表的所有约束信息。
   * @param tableName - 目标表名
   * @param database - (可选) 目标数据库名称
   * @returns {Promise<Constraint[]>} 约束信息数组
   */
  getTableConstraints(tableName: string, database?: string): Promise<Constraint[]>;

  /**
   * 获取指定表的所有关系（通常是外键）。
   * @param tableName - 目标表名
   * @param database - (可选) 目标数据库名称
   * @returns {Promise<Relation[]>} 关系信息数组
   */
  getTableRelations(tableName: string, database?: string): Promise<Relation[]>;
  
  /**
   * 从指定表中采样数据。
   * @param tableName - 目标表名
   * @param limit - (可选) 返回的最大记录数
   * @param offset - (可选) 起始记录的偏移量
   * @param where - (可选) SQL WHERE子句 (不包含 "WHERE" 关键字)
   * @returns {Promise<SampleData>} 采样数据结果
   */
  getSampleData(tableName: string, limit?: number, offset?: number, where?: string): Promise<SampleData>;

  /**
   * 执行一个只读的SQL查询。
   * @param query - 要执行的SQL查询语句
   * @param params - (可选) 查询参数数组
   * @returns {Promise<any[]>} 查询结果集
   */
  executeReadQuery(query: string, params?: any[]): Promise<any[]>;
}

/**
 * 连接器的可选配置项，通常用于连接池等高级设置。
 * @property {number} [poolSize] - 连接池的最大连接数
 * @property {number} [idleTimeout] - 连接在被关闭前的空闲超时时间（毫秒）
 * @property {number} [connectionTimeout] - 建立连接的超时时间（毫秒）
 * @property {boolean} [enableSSL] - 是否启用SSL/TLS
 */
export interface ConnectorOptions {
  readonly poolSize?: number;
  readonly idleTimeout?: number;
  readonly connectionTimeout?: number;
  readonly enableSSL?: boolean;
} 