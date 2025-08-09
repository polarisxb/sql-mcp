import { Injectable } from '../../core/di/decorators.js'
import { IMetadataService } from '../../services/metadata/interface.js'
import { ISecurityService } from '../../services/security/interface.js'
import { TableSchema } from '../../core/types/database.js'
import { formatError } from '../../utils/error.js'

interface TableSchemaHandlerInput {
  tableName: string
  database?: string
}

@Injectable()
export class TableSchemaHandler {
  constructor(
    private metadataService: IMetadataService,
    private securityService: ISecurityService
  ) {}
  
  async handle({ tableName, database }: TableSchemaHandlerInput) {
    this.securityService.validateIdentifier(tableName)
    if (database) this.securityService.validateIdentifier(database)
    try {
      const schema = await this.metadataService.getTableSchema(tableName, database)
      return {
        content: [{ type: 'text', text: this.formatTableSchema(schema) }]
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatError(error) }],
        isError: true
      }
    }
  }
  
  private formatTableSchema(schema: TableSchema): string {
    const lines: string[] = []
    lines.push(`# 表: ${schema.name}`)
    if (schema.comment) lines.push(`> ${schema.comment}`)
    lines.push('')
    lines.push('## 列')
    lines.push('| 列名 | 数据类型 | 可空 | 默认值 | 主键 | 自增 | 备注 |')
    lines.push('|------|----------|------|--------|------|------|------|')
    for (const col of schema.columns) {
      lines.push(`| ${col.name} | ${col.dataType} | ${col.nullable ? '是' : '否'} | ${col.defaultValue || ''} | ${col.isPrimaryKey ? '是' : ''} | ${col.isAutoIncrement ? '是' : ''} | ${col.comment || ''} |`)
    }
    lines.push('')
    if (schema.indexes && schema.indexes.length > 0) {
      lines.push('## 索引')
      lines.push('| 索引名 | 列 | 唯一 | 类型 |')
      lines.push('|--------|----|----|------|')
      for (const idx of schema.indexes) {
        lines.push(`| ${idx.name} | ${idx.columns.join(', ')} | ${idx.isUnique ? '是' : '否'} | ${idx.type || ''} |`)
      }
      lines.push('')
    }
    if (schema.constraints && schema.constraints.length > 0) {
      lines.push('## 约束')
      lines.push('| 约束名 | 类型 | 列 | 引用表 | 引用列 | 更新规则 | 删除规则 |')
      lines.push('|--------|------|----|--------|--------|----------|----------|')
      for (const con of schema.constraints) {
        lines.push(`| ${con.name} | ${con.type} | ${con.columns.join(', ')} | ${con.referencedTable || ''} | ${con.referencedColumns?.join(', ') || ''} | ${con.updateRule || ''} | ${con.deleteRule || ''} |`)
      }
      lines.push('')
    }
    return lines.join('\n')
  }
} 