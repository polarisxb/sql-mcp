import { Injectable } from '../../core/di/decorators.js'
import { ISamplerService } from '../../services/sampler/interface.js'
import { ISecurityService } from '../../services/security/interface.js'
import { formatError } from '../../utils/error.js'

interface QueryHandlerInput {
  sql: string
  params?: any[]
  limit?: number
  offset?: number
}

@Injectable()
export class QueryHandler {
  constructor(
    private samplerService: ISamplerService,
    private securityService: ISecurityService
  ) {}
  
  async handle({ sql, params = [], limit, offset = 0 }: QueryHandlerInput) {
    this.securityService.validateReadOnlyQuery(sql)

    // Resolve app config (best-effort)
    let cfg: any
    try { const { container } = await import('../../core/di/index.js'); const { APP_CONFIG } = await import('../../core/di/tokens.js'); cfg = (container as any).resolve(APP_CONFIG) } catch { cfg = undefined }
    const maxRows = Math.max(1, Number(limit ?? cfg?.security?.queryMaxRows ?? 200))
    const outputJsonOnly = Boolean(cfg?.mcp?.outputJsonOnly)
    const compact = Boolean(cfg?.mcp?.stdioCompact)

    const started = Date.now()
    try {
      const results = await this.samplerService.executeReadQuery(sql, params)
      const durationMs = Date.now() - started

      const totalRows = Array.isArray(results) ? results.length : 0
      const slice = results.slice(offset, offset + maxRows)
      const hasMore = offset + slice.length < totalRows
      const nextOffset = offset + slice.length

      const jsonPayload: any = {
        limit: maxRows,
        offset,
        nextOffset,
        hasMore,
        durationMs,
        columns: slice.length ? Object.keys(slice[0]) : [],
        data: slice.map(row => Object.values(row))
      }

      const jsonResource = {
        type: 'resource' as const,
        resource: {
          uri: 'memory://query-result.json',
          mimeType: 'application/json',
          text: JSON.stringify(jsonPayload)
        }
      }

      if (outputJsonOnly) {
        return { content: [jsonResource] }
      }

      return {
        content: [
          { type: 'text', text: this.formatQueryResults(slice, { compact, totalRows, durationMs, nextOffset, hasMore }) },
          jsonResource
        ]
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatError(error) }],
        isError: true
      }
    }
  }
  
  private formatQueryResults(results: any[], meta?: { compact?: boolean; totalRows?: number; durationMs?: number; nextOffset?: number; hasMore?: boolean, offset?: number }): string {
    if (!results.length) return '查询执行成功，但没有返回任何结果。'
    const lines: string[] = []
    const columns = Object.keys(results[0])
    const showSimpleCount = !meta?.hasMore && (meta?.totalRows === undefined || meta.totalRows === results.length)
    const countPart = showSimpleCount
      ? `${results.length} 行`
      : `${results.length}/${meta?.totalRows ?? results.length} 行`
    const headerParts = [`# 查询结果 (${countPart})`]
    if (meta?.durationMs !== undefined) headerParts.push(`耗时: ${meta.durationMs}ms`)
    if (meta?.hasMore) headerParts.push(`下一偏移: ${meta.nextOffset}`)
    lines.push(headerParts.join(' | '))
    lines.push('')
    lines.push(`| ${columns.join(' | ')} |`)
    lines.push(`| ${columns.map(() => '----').join(' | ')} |`)
    if (meta?.compact) {
      for (const row of results) {
        lines.push(`| ${columns.map(col => this.formatCell(row[col])).join(' | ')} |`)
      }
    } else {
      for (const row of results) {
        lines.push(`| ${columns.map(col => this.formatCell(row[col])).join(' | ')} |`)
      }
    }
    if (meta?.hasMore) {
      lines.push('')
      lines.push('*还有更多结果未显示，可使用 offset+limit 获取下一页*')
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