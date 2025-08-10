import { Injectable } from '../../core/di/decorators.js'
import { ISamplerService } from '../../services/sampler/interface.js'
import { ISecurityService } from '../../services/security/interface.js'
import { SampleData } from '../../core/types/database.js'
import { formatError } from '../../utils/error.js'

interface SampleDataHandlerInput {
  tableName: string
  limit?: number
  offset?: number
  where?: string
}

@Injectable()
export class SampleDataHandler {
  constructor(
    private samplerService: ISamplerService,
    private securityService: ISecurityService
  ) {}
  
  async handle({ tableName, limit = 10, offset = 0, where }: SampleDataHandlerInput) {
    this.securityService.validateIdentifier(tableName)
    if (where) this.securityService.validateWhereClause(where)
    try {
      const actualLimit = Math.min(limit, 100)
      const data = await this.samplerService.getSampleData(tableName, actualLimit, offset, where)
      const nextOffset = offset + (Array.isArray(data.data) ? data.data.length : 0)
      return {
        content: [
          { type: 'text', text: this.formatSampleData(data) },
          { type: 'json', json: { tableName, limit: actualLimit, offset, nextOffset, ...data } as any }
        ]
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatError(error) }],
        isError: true
      }
    }
  }
  
  private formatSampleData(sampleData: SampleData): string {
    const lines: string[] = []
    lines.push(`# 数据样本 (共 ${sampleData.total} 行)`) ; lines.push('')
    lines.push(`| ${sampleData.columns.join(' | ')} |`)
    lines.push(`| ${sampleData.columns.map(() => '----').join(' | ')} |`)
    for (const row of sampleData.data) {
      lines.push(`| ${row.map(cell => this.formatCell(cell)).join(' | ')} |`)
    }
    lines.push('')
    if (sampleData.hasMore) lines.push('*还有更多数据未显示*')
    return lines.join('\n')
  }
  
  private formatCell(value: any): string {
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toISOString()
      return JSON.stringify(value)
    }
    return String(value)
  }
} 