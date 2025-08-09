import { z } from 'zod'

// 表结构查询
export const TableSchemaToolSchema = {
  name: 'getTableSchema',
  title: '获取表结构',
  description: '获取指定数据库表的详细结构信息',
  inputSchema: {
    tableName: z.string().describe('表名'),
    database: z.string().optional().describe('数据库名（可选）')
  }
}

// 表列表查询
export const ListTablesToolSchema = {
  name: 'listTables',
  title: '获取表列表',
  description: '获取数据库中的所有表',
  inputSchema: {
    database: z.string().optional().describe('数据库名（可选）'),
    pattern: z.string().optional().describe('表名匹配模式，支持SQL LIKE语法')
  }
}

// 表关系查询
export const TableRelationsToolSchema = {
  name: 'getTableRelations',
  title: '获取表关系',
  description: '获取指定表的外键关系',
  inputSchema: {
    tableName: z.string().describe('表名'),
    database: z.string().optional().describe('数据库名（可选）')
  }
}

// 数据采样
export const SampleDataToolSchema = {
  name: 'getSampleData',
  title: '获取数据样本',
  description: '获取表的数据样本',
  inputSchema: {
    tableName: z.string().describe('表名'),
    limit: z.number().min(1).max(100).default(10).describe('返回记录数量（1-100）'),
    offset: z.number().min(0).default(0).describe('起始记录偏移量'),
    where: z.string().optional().describe('WHERE条件（不含WHERE关键字）')
  }
}

// 执行自定义查询（只读）
export const ExecuteQueryToolSchema = {
  name: 'executeQuery',
  title: '执行SQL查询',
  description: '执行只读SQL查询',
  inputSchema: {
    sql: z.string().describe('SQL查询语句（仅支持SELECT和SHOW）'),
    params: z.array(z.any()).optional().describe('查询参数')
  }
}

// 资源URI模板
export const DatabaseResourceTemplate = 'db://{database}'
export const TableResourceTemplate = 'db://{database}/{table}'
export const SchemaResourceTemplate = 'schema://{database}/{table}'

export type TableSchemaInput = z.infer<z.ZodObject<any>> 