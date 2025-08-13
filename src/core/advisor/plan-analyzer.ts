import { PlanAnalysis, PlanSignal, RiskItem } from './types.js'

export class PlanAnalyzer {
  analyze(plan: any): PlanAnalysis {
    const summary: string[] = []
    const risks: RiskItem[] = []
    const signals: PlanSignal[] = []
    const json = plan || {}
    const text = JSON.stringify(json).toLowerCase()

    const flags = {
      usingFilesort: text.includes('using filesort') || text.includes('filesort') || text.includes('sorting_operation'),
      usingTemporary: text.includes('using temporary') || text.includes('temp table') || text.includes('temporary')
    }

    // Walk common nodes to produce compact summary
    const root = (json && (json.query_block || json))
    const walk = (node: any) => {
      if (!node) return
      const table = node.table_name || node.table?.table_name
      const access = node.access_type || node.table?.access_type
      const rows = node.rows_examined_per_scan || node.rows || node.table?.rows_examined_per_scan
      const filtered = node.filtered || (node.attached_condition ? 'with filter' : '')
      if (table || access || rows) summary.push([table, access, rows && `${rows} rows`, filtered].filter(Boolean).join(' / '))
      if (node.table) walk(node.table)
      if (Array.isArray(node.nested_loop)) node.nested_loop.forEach(walk)
      if (node.grouping_operation) walk(node.grouping_operation)
      if (node.sorting_operation) walk(node.sorting_operation)
    }
    walk(root)

    if (flags.usingFilesort) {
      risks.push({ id: 'filesort', level: 'should', reason: '存在文件排序/排序操作，可能造成额外开销', evidence: { node: 'sorting_operation' } })
      signals.push({ id: 'filesort', message: 'Filesort detected' })
    }
    if (flags.usingTemporary) {
      risks.push({ id: 'temporary', level: 'should', reason: '使用临时表，可能带来性能问题', evidence: { node: 'temporary' } })
      signals.push({ id: 'temporary', message: 'Temporary table detected' })
    }
    if (text.includes('full scan') || text.includes('all"')) {
      risks.push({ id: 'full_scan', level: 'must', reason: '存在全表扫描', evidence: {} })
      signals.push({ id: 'full_scan', message: 'Full table scan' })
    }

    return { summary, risks, signals, flags }
  }
} 