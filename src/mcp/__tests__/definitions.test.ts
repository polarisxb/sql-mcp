import { describe, test, expect } from 'vitest'
import {
  TableSchemaToolSchema,
  ListTablesToolSchema,
  TableRelationsToolSchema,
  SampleDataToolSchema,
  ExecuteQueryToolSchema,
  DatabaseResourceTemplate,
  TableResourceTemplate,
  SchemaResourceTemplate
} from '../definitions.js'
import { z } from 'zod'

describe('MCP definitions', () => {
  test('tool definitions have required fields', () => {
    expect(TableSchemaToolSchema.name).toBe('getTableSchema')
    expect(ListTablesToolSchema.name).toBe('listTables')
    expect(TableRelationsToolSchema.name).toBe('getTableRelations')
    expect(SampleDataToolSchema.name).toBe('getSampleData')
    expect(ExecuteQueryToolSchema.name).toBe('executeQuery')
  })

  test('zod schemas validate inputs', () => {
    const schema1 = z.object(TableSchemaToolSchema.inputSchema)
    expect(schema1.parse({ tableName: 't' })).toBeTruthy()

    const schema2 = z.object(ListTablesToolSchema.inputSchema)
    expect(schema2.parse({})).toBeTruthy()

    const schema3 = z.object(SampleDataToolSchema.inputSchema)
    expect(schema3.parse({ tableName: 't', limit: 10, offset: 0 })).toBeTruthy()
    expect(() => schema3.parse({ tableName: 't', limit: 0 })).toThrow()

    const schema4 = z.object(ExecuteQueryToolSchema.inputSchema)
    expect(schema4.parse({ sql: 'SELECT 1' })).toBeTruthy()
  })

  test('resource templates are correct', () => {
    expect(DatabaseResourceTemplate).toBe('db://{database}')
    expect(TableResourceTemplate).toBe('db://{database}/{table}')
    expect(SchemaResourceTemplate).toBe('schema://{database}/{table}')
  })
}) 