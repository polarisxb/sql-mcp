/**
 * 支持的数据库类型枚举
 */
export enum DatabaseType {
  MySQL = 'mysql',
  PostgreSQL = 'postgresql',
  SQLite = 'sqlite'
}

/**
 * 数据库连接配置
 * @property {DatabaseType} type - 数据库类型
 * @property {string} host - 主机名
 * @property {number} port - 端口号
 * @property {string} user - 用户名
 * @property {string} password - 密码
 * @property {string} database - 数据库名称
 * @property {boolean} [ssl] - 是否启用SSL连接
 * @property {number} [connectionTimeout] - 连接超时时间（毫秒）
 */
export interface ConnectionConfig {
  readonly type: DatabaseType;
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly database: string;
  readonly ssl?: boolean;
  readonly connectionTimeout?: number;
}

/**
 * 数据库表结构信息
 * @property {string} name - 表名
 * @property {readonly ColumnInfo[]} columns - 列信息数组
 * @property {readonly string[]} [primaryKey] - 主键列名数组
 * @property {readonly Index[]} [indexes] - 索引信息数组
 * @property {readonly Constraint[]} [constraints] - 约束信息数组
 * @property {string} [comment] - 表注释
 */
export interface TableSchema {
  readonly name: string;
  readonly columns: readonly ColumnInfo[];
  readonly primaryKey?: readonly string[];
  readonly indexes?: readonly Index[];
  readonly constraints?: readonly Constraint[];
  readonly comment?: string;
}

/**
 * 表列的详细信息
 * @property {string} name - 列名
 * @property {string} dataType - 数据类型
 * @property {boolean} nullable - 是否允许为空
 * @property {string} [defaultValue] - 默认值
 * @property {boolean} isPrimaryKey - 是否为主键
 * @property {boolean} isAutoIncrement - 是否自增
 * @property {string} [comment] - 列注释
 * @property {number} [characterMaximumLength] - 字符串最大长度
 * @property {number} [numericPrecision] - 数字精度
 * @property {number} [numericScale] - 数字小数位数
 */
export interface ColumnInfo {
  readonly name: string;
  readonly dataType: string;
  readonly nullable: boolean;
  readonly defaultValue?: string;
  readonly isPrimaryKey: boolean;
  readonly isAutoIncrement: boolean;
  readonly comment?: string;
  readonly characterMaximumLength?: number;
  readonly numericPrecision?: number;
  readonly numericScale?: number;
}

/**
 * 表索引信息
 * @property {string} name - 索引名称
 * @property {readonly string[]} columns - 索引包含的列名数组
 * @property {boolean} isUnique - 是否为唯一索引
 * @property {string} [type] - 索引类型 (e.g., BTREE)
 */
export interface Index {
  readonly name: string;
  readonly columns: readonly string[];
  readonly isUnique: boolean;
  readonly type?: string;
}

/**
 * 表约束信息
 * @property {string} name - 约束名称
 * @property {'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK'} type - 约束类型
 * @property {readonly string[]} columns - 约束涉及的列
 * @property {string} [referencedTable] - 外键引用的表
 * @property {readonly string[]} [referencedColumns] - 外键引用的列
 * @property {string} [updateRule] - 外键更新规则
 * @property {string} [deleteRule] - 外键删除规则
 */
export interface Constraint {
  readonly name: string;
  readonly type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  readonly columns: readonly string[];
  readonly referencedTable?: string;
  readonly referencedColumns?: readonly string[];
  readonly updateRule?: string;
  readonly deleteRule?: string;
}

/**
 * 表之间关系的详细信息（主要用于外键）
 * @property {string} constraintName - 约束名称
 * @property {string} sourceTable - 源表名
 * @property {readonly string[]} sourceColumns - 源表列名
 * @property {string} targetTable - 目标表名
 * @property {readonly string[]} targetColumns - 目标表列名
 * @property {string} updateRule - 更新规则
 * @property {string} deleteRule - 删除规则
 */
export interface Relation {
  readonly constraintName: string;
  readonly sourceTable: string;
  readonly sourceColumns: readonly string[];
  readonly targetTable: string;
  readonly targetColumns: readonly string[];
  readonly updateRule: string;
  readonly deleteRule: string;
}

/**
 * 数据采样查询的结果
 * @property {readonly string[]} columns - 列名数组
 * @property {readonly any[][]} data - 数据行数组
 * @property {number} total - 表中的总记录数
 * @property {boolean} hasMore - 是否还有更多数据（基于当前limit和offset）
 */
export interface SampleData {
  readonly columns: readonly string[];
  readonly data: readonly any[][];
  readonly total: number;
  readonly hasMore: boolean;
} 