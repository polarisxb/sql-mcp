import { describe, it, expect } from 'vitest';
import { 
  TableSchemaInputSchema, 
  ListTablesInputSchema, 
  SampleDataInputSchema, 
  QueryInputSchema 
} from './mcp.js';

describe('MCP Type Schemas (Zod)', () => {

  // --- 测试 TableSchemaInputSchema ---
  describe('TableSchemaInputSchema', () => {
    it('should validate a correct input with all fields', () => {
      const input = { tableName: 'users', database: 'main' };
      const result = TableSchemaInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate a correct input with only required fields', () => {
      const input = { tableName: 'products' };
      const result = TableSchemaInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should fail if tableName is missing', () => {
      const input = { database: 'main' };
      const result = TableSchemaInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail if tableName is not a string', () => {
        const input = { tableName: 123 };
        const result = TableSchemaInputSchema.safeParse(input);
        expect(result.success).toBe(false);
    });
  });

  // --- 测试 ListTablesInputSchema ---
  describe('ListTablesInputSchema', () => {
    it('should validate an empty object', () => {
      const result = ListTablesInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with a database name', () => {
      const input = { database: 'analytics' };
      const result = ListTablesInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with a pattern', () => {
      const input = { pattern: 'order_%' };
      const result = ListTablesInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  // --- 测试 SampleDataInputSchema ---
  describe('SampleDataInputSchema', () => {
    it('should validate with only tableName and apply defaults', () => {
      const input = { tableName: 'customers' };
      const parsed = SampleDataInputSchema.parse(input);
      expect(parsed.tableName).toBe('customers');
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(0);
      expect(parsed.where).toBeUndefined();
    });

    it('should accept and validate all fields', () => {
      const input = { tableName: 'customers', limit: 50, offset: 100, where: "age > 30" };
      const result = SampleDataInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should fail if limit is not a positive integer', () => {
      const input = { tableName: 'customers', limit: -5 };
      const result = SampleDataInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail if offset is not a non-negative integer', () => {
        const input = { tableName: 'customers', offset: -1 };
        const result = SampleDataInputSchema.safeParse(input);
        expect(result.success).toBe(false);
    });

    it('should fail if tableName is missing', () => {
        const input = { limit: 10 };
        const result = SampleDataInputSchema.safeParse(input);
        expect(result.success).toBe(false);
    });
  });

  // --- 测试 QueryInputSchema ---
  describe('QueryInputSchema', () => {
    it('should validate with only sql field', () => {
      const input = { sql: 'SELECT * FROM users' };
      const result = QueryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with sql and params fields', () => {
      const input = { sql: 'SELECT * FROM users WHERE id = ?', params: [1] };
      const result = QueryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.params).toEqual([1]);
      }
    });

    it('should fail if sql is missing', () => {
      const input = { params: [1] };
      const result = QueryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should fail if params is not an array', () => {
        const input = { sql: 'SELECT 1', params: 'not-an-array' };
        const result = QueryInputSchema.safeParse(input);
        expect(result.success).toBe(false);
    });
  });
}); 