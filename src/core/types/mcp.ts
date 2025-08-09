import { z } from 'zod';
import { TableSchema, SampleData } from './database.js';

/**
 * MCP工具 `getTableSchema` 的输入参数Zod Schema。
 * 用于验证获取单个表结构的请求。
 */
export const TableSchemaInputSchema = z.object({
  tableName: z.string().describe("需要查询的数据库表名"),
  database: z.string().optional().describe("数据库名称，不提供时使用连接中的默认数据库")
});
/**
 * `TableSchemaInputSchema` 推断出的TypeScript类型。
 */
export type TableSchemaInput = z.infer<typeof TableSchemaInputSchema>;

/**
 * MCP工具 `listTables` 的输入参数Zod Schema。
 * 用于验证获取表列表的请求。
 */
export const ListTablesInputSchema = z.object({
  database: z.string().optional().describe("数据库名称，不提供时使用连接中的默认数据库"),
  pattern: z.string().optional().describe("表名筛选模式，支持SQL LIKE语法 (例如 'user_%')")
});
/**
 * `ListTablesInputSchema` 推断出的TypeScript类型。
 */
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

/**
 * MCP工具 `getSampleData` 的输入参数Zod Schema。
 * 用于验证数据采样请求。
 */
export const SampleDataInputSchema = z.object({
  tableName: z.string().describe("需要采样数据的表名"),
  limit: z.number().int().positive().default(10).describe("返回的最大记录数"),
  offset: z.number().int().nonnegative().default(0).describe("起始记录的偏移量"),
  where: z.string().optional().describe("SQL WHERE子句 (不包含 'WHERE' 关键字)")
});
/**
 * `SampleDataInputSchema` 推断出的TypeScript类型。
 */
export type SampleDataInput = z.infer<typeof SampleDataInputSchema>;

/**
 * MCP工具 `executeQuery` 的输入参数Zod Schema。
 * 用于验证自定义只读查询的请求。
 */
export const QueryInputSchema = z.object({
  sql: z.string().describe("要执行的SQL查询语句 (通常限制为SELECT)"),
  params: z.array(z.any()).optional().describe("查询参数数组，用于防止SQL注入")
});
/**
 * `QueryInputSchema` 推断出的TypeScript类型。
 */
export type QueryInput = z.infer<typeof QueryInputSchema>;

// --- 响应类型 ---

/**
 * MCP工具 `getTableSchema` 的成功响应体。
 * @property {TableSchema} schema - 查询到的表结构信息。
 */
export interface TableSchemaResult {
  readonly schema: TableSchema;
}

/**
 * MCP工具 `listTables` 的成功响应体。
 * @property {string[]} tables - 符合条件的表名列表。
 */
export interface ListTablesResult {
  readonly tables: readonly string[];
}

/**
 * MCP工具 `getSampleData` 的成功响应体。
 * @property {SampleData} samples - 采样数据结果。
 */
export interface SampleDataResult {
  readonly samples: SampleData;
}

/**
 * MCP工具 `executeQuery` 的成功响应体。
 * @property {any[]} results - 查询返回的结果集。
 * @property {{ name: string; type: string }[]} [fields] - (可选) 结果集的字段信息数组。
 */
export interface QueryResult {
  readonly results: readonly any[];
  readonly fields?: readonly { name: string; type: string }[];
} 