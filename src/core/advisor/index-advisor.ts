import { PlanAnalysis, Suggestion } from './types.js'

export interface SqlShapeInfo {
  tables: string[]
  joins: string[]
  filters: string[]
  orderBy?: string
  limit?: string
  selectAll: boolean
  joinKeys: string[]
  aliasToTable?: Record<string, string>
}

export class IndexAdvisor {
  advise(analysis: PlanAnalysis, shape: SqlShapeInfo): Suggestion[] {
    const out: Suggestion[] = []
    // Filesort + ORDER BY present → suggest index on order by columns
    if (analysis.flags.usingFilesort && shape.orderBy) {
      out.push({
        id: 'idx_order_by',
        level: 'should',
        action: '为 ORDER BY 涉及的列建立匹配顺序的索引',
        reason: '计划显示存在排序操作，可能产生 filesort',
        evidence: { orderBy: shape.orderBy }
      })
    }
    // Full scan or filters present → suggest index on filter columns
    if (analysis.risks.find(r => r.id === 'full_scan') || shape.filters.length) {
      out.push({
        id: 'idx_filters',
        level: 'should',
        action: '为 WHERE 过滤列建立合适索引（等值列在前，范围列靠后）',
        reason: '计划或查询形态显示过滤较多',
        evidence: { filters: shape.filters }
      })
    }
    // Join keys present → suggest index
    if (shape.joinKeys.length) {
      out.push({
        id: 'idx_join_keys',
        level: 'must',
        action: '为 JOIN 连接键建立索引（在被驱动表上）',
        reason: '缺少连接键索引会导致每行匹配开销大',
        evidence: { joinKeys: shape.joinKeys, aliasToTable: shape.aliasToTable || {} }
      })
    }
    // Avoid SELECT *
    if (shape.selectAll) {
      out.push({
        id: 'avoid_select_all',
        level: 'nice',
        action: '避免 SELECT *，仅选择必要列（可搭配覆盖索引）',
        reason: '减少 IO 与上下文体积'
      })
    }
    return out
  }
} 