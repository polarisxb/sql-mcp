import { Injectable } from '../../core/di/decorators.js'
import { ISamplerService } from '../../services/sampler/interface.js'
import { ISecurityService } from '../../services/security/interface.js'
import { formatError } from '../../utils/error.js'

interface QueryHandlerInput {
  sql: string
  params?: any[]
}

@Injectable()
export class QueryHandler {
  constructor(
    private samplerService: ISamplerService,
    private securityService: ISecurityService
  ) {}
  
  async handle({ sql, params = [] }: QueryHandlerInput) {
    this.securityService.validateReadOnlyQuery(sql)
    try {
      const results = await this.samplerService.executeReadQuery(sql, params)
      return { content: [{ type: 'text', text: this.formatQueryResults(results) }] }
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatError(error) }],
        isError: true
      }
    }
  }
  
  private formatQueryResults(results: any[]): string {
    if (!results.length) return '查询执行成功，但没有返回任何结果。'
    const lines: string[] = []
    const columns = Object.keys(results[0])
    lines.push(`# 查询结果 (${results.length} 行)`) ; lines.push('')
    lines.push(`| ${columns.join(' | ')} |`)
    lines.push(`| ${columns.map(() => '----').join(' | ')} |`)
    for (const row of results) {
      lines.push(`| ${columns.map(col => this.formatCell(row[col])).join(' | ')} |`)
    }
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