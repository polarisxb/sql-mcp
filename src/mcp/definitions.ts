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
    pattern: z.string().optional().describe('表名匹配模式（支持 LIKE，未含通配符时按子串匹配）')
  }
}

// 按模式检索表（别名工具，便于直觉式调用）
export const SearchTablesToolSchema = {
  name: 'searchTables',
  title: '检索表',
  description: '按名称模式检索表（支持 SQL LIKE 语法）',
  inputSchema: {
    database: z.string().optional().describe('数据库名（可选）'),
    pattern: z.string().describe('表名匹配模式（支持 LIKE，未含通配符时按子串匹配）')
  }
}

// 按模式检索列
export const SearchColumnsToolSchema = {
  name: 'searchColumns',
  title: '检索列',
  description: '按列名/类型/备注进行检索（支持 SQL LIKE 语法）',
  inputSchema: {
    database: z.string().optional().describe('数据库名（可选）'),
    pattern: z.string().describe('列名/类型/备注匹配（支持 LIKE，未含通配符时按子串匹配）')
  }
}

// 刷新缓存
export const RefreshCacheToolSchema = {
  name: 'refreshCache',
  title: '刷新元数据缓存',
  description: '刷新元数据缓存（全部或指定表）',
  inputSchema: {
    scope: z.enum(['all', 'table']).describe('刷新范围'),
    database: z.string().optional().describe('数据库名（当 scope=table 可选）'),
    tableName: z.string().optional().describe('表名（当 scope=table 必填）')
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
    where: z.string().optional().describe('WHERE 条件（不含 WHERE 关键字）')
  }
}

// 执行自定义查询（只读）
export const ExecuteQueryToolSchema = {
  name: 'executeQuery',
  title: '执行 SQL 查询',
  description: '执行只读 SQL 查询',
  inputSchema: {
    sql: z.string().describe('SQL 查询语句（仅支持 SELECT 和 SHOW）'),
    params: z.array(z.any()).optional().describe('查询参数'),
    limit: z.number().min(1).max(10000).optional().describe('返回的最大行数（可选）'),
    offset: z.number().min(0).optional().describe('起始偏移量（可选）')
  }
}

// SQL 导师：解释查询
export const ExplainQueryToolSchema = {
  name: 'explainQuery',
  title: '解释 SQL 查询',
  description: '输出查询涉及的表/连接/过滤/排序与执行计划要点（只读）',
  inputSchema: {
    sql: z.string().describe('SQL 查询语句（仅支持 SELECT/SHOW）')
  }
}

// SQL 导师：优化建议
export const OptimizeQueryToolSchema = {
  name: 'optimizeQuery',
  title: '优化 SQL 查询',
  description: '基于 EXPLAIN 与规则给出优化建议（只读，不执行）',
  inputSchema: {
    sql: z.string().describe('SQL 查询语句（仅支持 SELECT/SHOW）')
  }
}

// SQL 导师：生成示例
export const GenerateExamplesToolSchema = {
  name: 'generateExamples',
  title: '生成示例查询',
  description: '按表生成常见示例查询与简要讲解',
  inputSchema: {
    tableName: z.string().describe('表名')
  }
}

// SQL 导师：修复报错
export const FixQueryToolSchema = {
  name: 'fixQuery',
  title: '修复 SQL 报错（只读）',
  description: '根据错误信息给出只读等价写法或修复建议，不执行写操作',
  inputSchema: {
    sql: z.string().describe('原始 SQL'),
    error: z.string().describe('错误信息/数据库返回的报错')
  }
}

// SQL 导师：索引建议（新）
export const IndexAdvisorToolSchema = {
  name: 'indexAdvisor',
  title: '索引建议',
  description: '基于执行计划与查询形态给出索引建议（只读）',
  inputSchema: {
    sql: z.string().describe('SQL 查询语句（仅支持 SELECT/SHOW）')
  }
}

// SQL 导师：查询改写（新）
export const RewriteQueryToolSchema = {
  name: 'rewriteQuery',
  title: '查询改写',
  description: '输出只读等价的查询改写草案与模板（不执行）',
  inputSchema: {
    sql: z.string().describe('SQL 查询语句（仅支持 SELECT/SHOW）')
  }
}

// 系统自检（新）
export const DoctorToolSchema = {
  name: 'doctor',
  title: '系统自检',
  description: '检查连通性、只读查询和 EXPLAIN 可用性',
  inputSchema: {}
}

// 资源URI模板
export const DatabaseResourceTemplate = 'db://{database}'
export const TableResourceTemplate = 'db://{database}/{table}'
export const SchemaResourceTemplate = 'schema://{database}/{table}'

export type TableSchemaInput = z.infer<z.ZodObject<any>> 