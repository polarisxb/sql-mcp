export class MySQLQueryBuilder {
  buildGetDatabasesQuery(): string {
    return 'SHOW DATABASES';
  }
  
  buildGetTablesQuery(): string {
    return `
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `;
  }
  
  buildGetTableColumnsQuery(): string {
    return `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        EXTRA,
        COLUMN_COMMENT,
        COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
  }
  
  buildGetPrimaryKeyQuery(): string {
    return `
      SELECT 
        COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE 
        TABLE_SCHEMA = ? 
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = 'PRIMARY'
      ORDER BY ORDINAL_POSITION
    `;
  }
  
  buildGetIndexesQuery(): string {
    return `
      SELECT 
        INDEX_NAME,
        COLUMN_NAME,
        NON_UNIQUE,
        SEQ_IN_INDEX,
        INDEX_TYPE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `;
  }
  
  buildGetConstraintsQuery(): string {
    return `
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
      FROM information_schema.TABLE_CONSTRAINTS tc
      JOIN information_schema.KEY_COLUMN_USAGE kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND tc.TABLE_NAME = kcu.TABLE_NAME
      LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
        ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
      WHERE tc.TABLE_SCHEMA = ? AND tc.TABLE_NAME = ?
      ORDER BY tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
    `;
  }
  
  buildGetRelationsQuery(): string {
    return `
      SELECT 
        rc.CONSTRAINT_NAME,
        kcu.TABLE_NAME as source_table,
        kcu.COLUMN_NAME as source_column,
        kcu.REFERENCED_TABLE_NAME as target_table,
        kcu.REFERENCED_COLUMN_NAME as target_column,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
      FROM information_schema.REFERENTIAL_CONSTRAINTS rc
      JOIN information_schema.KEY_COLUMN_USAGE kcu
        ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      WHERE 
        rc.CONSTRAINT_SCHEMA = ? 
        AND (kcu.TABLE_NAME = ? OR kcu.REFERENCED_TABLE_NAME = ?)
      ORDER BY rc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
    `;
  }
  
  buildGetTableCommentQuery(): string {
    return `
      SELECT TABLE_COMMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;
  }
  
  buildGetTableRowCountQuery(where?: string): string {
    // information_schema.TABLES.TABLE_ROWS 在InnoDB是估计值，已知行为
    return `
      SELECT TABLE_ROWS as row_count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;
  }
  
  buildGetSampleDataQuery(limit: number, offset: number, where?: string): string {
    const whereClause = where ? `WHERE ${where}` : '';
    return `
      SELECT *
      FROM ??.??
      ${whereClause}
      LIMIT ${limit} OFFSET ${offset}
    `;
  }
} 