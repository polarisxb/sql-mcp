import { ColumnInfo, Index, Constraint, Relation } from '../../core/types/database.js'

export class MySQLMetadataMapper {
  mapColumns(rows: any[]): ColumnInfo[] {
    return rows.map(row => ({
      name: row.COLUMN_NAME,
      dataType: this.normalizeDataType(row.DATA_TYPE, row),
      nullable: row.IS_NULLABLE === 'YES',
      defaultValue: row.COLUMN_DEFAULT ?? undefined,
      isPrimaryKey: false,
      isAutoIncrement: typeof row.EXTRA === 'string' && row.EXTRA.includes('auto_increment'),
      comment: row.COLUMN_COMMENT || '',
      characterMaximumLength: row.CHARACTER_MAXIMUM_LENGTH ?? undefined,
      numericPrecision: row.NUMERIC_PRECISION ?? undefined,
      numericScale: row.NUMERIC_SCALE ?? undefined
    }))
  }
  
  private normalizeDataType(dataType: string, row: any): string {
    const lower = (dataType || '').toLowerCase()
    if (['char', 'varchar', 'binary', 'varbinary'].includes(lower)) {
      return `${lower}(${row.CHARACTER_MAXIMUM_LENGTH})`
    }
    if (['decimal', 'numeric'].includes(lower)) {
      return `${lower}(${row.NUMERIC_PRECISION}, ${row.NUMERIC_SCALE})`
    }
    if (['enum', 'set'].includes(lower)) {
      return row.COLUMN_TYPE || lower
    }
    return lower
  }
  
  mapPrimaryKey(rows: any[]): string[] {
    return rows.map(row => row.COLUMN_NAME)
  }
  
  mapIndexes(rows: any[]): Index[] {
    const indexMap = new Map<string, { columns: string[]; isUnique: boolean; type?: string }>()
    for (const row of rows) {
      const name = row.INDEX_NAME
      if (!indexMap.has(name)) {
        indexMap.set(name, {
          columns: [],
          isUnique: row.NON_UNIQUE === 0,
          type: row.INDEX_TYPE
        })
      }
      indexMap.get(name)!.columns.push(row.COLUMN_NAME)
    }
    return Array.from(indexMap.entries()).map(([name, v]) => ({
      name,
      columns: v.columns,
      isUnique: v.isUnique,
      type: v.type
    }))
  }
  
  mapConstraints(rows: any[]): Constraint[] {
    const map = new Map<string, {
      type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK',
      columns: string[],
      referencedTable?: string,
      referencedColumns?: string[],
      updateRule?: string,
      deleteRule?: string
    }>()
    for (const row of rows) {
      const name = row.CONSTRAINT_NAME
      const type = row.CONSTRAINT_TYPE as any
      if (!map.has(name)) {
        map.set(name, {
          type,
          columns: [],
          referencedTable: row.REFERENCED_TABLE_NAME,
          referencedColumns: row.REFERENCED_COLUMN_NAME ? [row.REFERENCED_COLUMN_NAME] : undefined,
          updateRule: row.UPDATE_RULE,
          deleteRule: row.DELETE_RULE
        })
      }
      const c = map.get(name)!
      c.columns.push(row.COLUMN_NAME)
      if (row.REFERENCED_COLUMN_NAME && c.referencedColumns && !c.referencedColumns.includes(row.REFERENCED_COLUMN_NAME)) {
        c.referencedColumns.push(row.REFERENCED_COLUMN_NAME)
      }
    }
    return Array.from(map.entries()).map(([name, c]) => ({
      name,
      type: c.type,
      columns: c.columns,
      referencedTable: c.referencedTable,
      referencedColumns: c.referencedColumns,
      updateRule: c.updateRule,
      deleteRule: c.deleteRule
    }))
  }
  
  mapRelations(rows: any[]): Relation[] {
    const map = new Map<string, {
      sourceTable: string,
      sourceColumns: string[],
      targetTable: string,
      targetColumns: string[],
      updateRule: string,
      deleteRule: string
    }>()
    for (const row of rows) {
      const key = row.CONSTRAINT_NAME
      if (!map.has(key)) {
        map.set(key, {
          sourceTable: row.source_table,
          sourceColumns: [],
          targetTable: row.target_table,
          targetColumns: [],
          updateRule: row.UPDATE_RULE,
          deleteRule: row.DELETE_RULE
        })
      }
      const r = map.get(key)!
      r.sourceColumns.push(row.source_column)
      r.targetColumns.push(row.target_column)
    }
    return Array.from(map.entries()).map(([constraintName, r]) => ({
      constraintName,
      sourceTable: r.sourceTable,
      sourceColumns: r.sourceColumns,
      targetTable: r.targetTable,
      targetColumns: r.targetColumns,
      updateRule: r.updateRule,
      deleteRule: r.deleteRule
    }))
  }
} 