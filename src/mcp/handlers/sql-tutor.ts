import { Injectable } from '../../core/di/decorators.js'
import { ISecurityService } from '../../services/security/interface.js'
import { container } from '../../core/di/index.js'
import { DATABASE_CONNECTOR, METADATA_SERVICE } from '../../core/di/tokens.js'
import { PlanAnalyzer } from '../../core/advisor/plan-analyzer.js'
import { IndexAdvisor } from '../../core/advisor/index-advisor.js'
import { AdvisorEvidence, Suggestion } from '../../core/advisor/types.js'
import { QueryRewriter } from '../../core/advisor/query-rewriter.js'
import { IMetadataService } from '../../services/metadata/interface.js'

interface ExplainInput { sql: string }
interface OptimizeInput { sql: string }
interface GenerateExamplesInput { tableName: string }
interface FixInput { sql: string; error: string }

@Injectable()
export class SqlTutorHandler {
  private analyzer = new PlanAnalyzer()
  private indexAdvisor = new IndexAdvisor()
  private rewriter = new QueryRewriter()

  constructor(private security: ISecurityService, private metadata?: IMetadataService) {}

  async explain({ sql }: ExplainInput) {
    this.security.validateReadOnlyQuery(sql)
    const normalized = sql.trim().replace(/\s+/g, ' ')
    const plan = await this.safeExplain(sql)
    const analysis = this.analyzer.analyze(plan)
    const info = this.analyzeSqlShape(sql)

    const lines: string[] = []
    lines.push('# 查询解释')
    lines.push('')
    lines.push(`SQL: \`${normalized}\``)
    if (info.tables.length) lines.push(`涉及表: ${info.tables.join(', ')}`)
    if (info.joins.length) lines.push(`连接: ${info.joins.join(' | ')}`)
    if (info.filters.length) lines.push(`过滤条件: ${info.filters.join(' AND ')}`)
    if (info.orderBy) lines.push(`排序: ${info.orderBy}`)
    if (info.limit) lines.push(`限制: ${info.limit}`)
    if (analysis.summary.length) {
      lines.push('')
      lines.push('执行计划要点:')
      for (const s of analysis.summary) lines.push(`- ${s}`)
    }
    if (analysis.risks.length) {
      lines.push('')
      lines.push('潜在风险:')
      for (const r of analysis.risks) lines.push(`- [${r.level}] ${r.reason}`)
    }

    const evidence = this.evidenceResource({ plan, analysis })
    return { content: [{ type: 'text' as const, text: lines.join('\n') }, evidence] }
  }

  async optimize({ sql }: OptimizeInput) {
    this.security.validateReadOnlyQuery(sql)
    const plan = await this.safeExplain(sql)
    const analysis = this.analyzer.analyze(plan)
    const info = this.analyzeSqlShape(sql)

    let suggestions: Suggestion[] = this.indexAdvisor.advise(analysis, info)
    const redundancy = await this.adviseRedundantIndexes(info)
    suggestions = suggestions.concat(redundancy)

    const rewrites = this.rewriter.rewrite(sql)
    if (!suggestions.length && !rewrites.length) {
      suggestions.push({ id: 'noop', level: 'nice', action: '当前查询较简单，暂无明显优化建议。', reason: '未检测到明显风险或可优化点' })
    }

    const lines = ['# 优化建议（基于 EXPLAIN 与规则）', '']
    for (const s of suggestions) lines.push(`- [${s.level}] ${s.action} —— ${s.reason}`)
    if (rewrites.length) {
      lines.push('', '## 可选改写（只读等价草案）')
      for (const r of rewrites) {
        lines.push(`- ${r.description}`)
        if (r.sql) { lines.push('```sql'); lines.push(r.sql); lines.push('```') }
      }
    }

    const evidence: AdvisorEvidence = { plan, analysis, suggestions, rewrites }
    const resource = this.evidenceResource(evidence)
    return { content: [{ type: 'text' as const, text: lines.join('\n') }, resource] }
  }

  async generateExamples({ tableName }: GenerateExamplesInput) {
    this.security.validateIdentifier(tableName)
    const examples = [
      { title: '计数', sql: `SELECT COUNT(*) AS cnt FROM ${tableName};` },
      { title: '最近创建的 10 条', sql: `SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT 10;` },
      { title: '按列分组统计', sql: `SELECT 1 AS group_key, COUNT(*) AS cnt FROM ${tableName} GROUP BY 1 ORDER BY cnt DESC LIMIT 10;` }
    ]
    const lines: string[] = ['# 示例查询', '']
    for (const e of examples) {
      lines.push(`## ${e.title}`)
      lines.push('```sql')
      lines.push(e.sql)
      lines.push('```')
      lines.push('')
    }
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
  }

  async fix({ sql, error }: FixInput) {
    const lines: string[] = ['# 修复建议（只读）', '']
    lines.push(`原始错误: ${error}`)
    if (/unknown column/i.test(error)) lines.push('- 检查列名是否正确，或使用别名后在外层引用正确别名。')
    if (/syntax/i.test(error)) lines.push('- 检查 SQL 语法与括号/引号配对，逐步简化定位问题。')
    if (/doesn\'t exist/i.test(error)) lines.push('- 检查表/库是否存在，或是否缺少库名前缀。')
    lines.push('- 确保查询为只读（SELECT/SHOW），避免使用写入/DDL 语句。')
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] }
  }

  private async adviseRedundantIndexes(info: ReturnType<SqlTutorHandler['analyzeSqlShape']>): Promise<Suggestion[]> {
    try {
      const meta = this.metadata || (container.resolve(METADATA_SERVICE) as IMetadataService)
      const realTables = new Set<string>([...info.tables, ...Object.values(info.aliasToTable || {})].filter(Boolean))
      const suggestions: Suggestion[] = []
      for (const tbl of realTables) {
        const schema = await meta.getTableSchema(tbl)
        const indexes = schema.indexes || []
        // duplicate indexes
        for (let i = 0; i < indexes.length; i++) {
          for (let j = i + 1; j < indexes.length; j++) {
            const a = indexes[i], b = indexes[j]
            if (a.columns.join(',') === b.columns.join(',')) {
              suggestions.push({ id: 'idx_duplicate', level: 'nice', action: `索引重复：${a.name}/${b.name}（列相同）`, reason: `表 ${tbl} 存在重复索引`, evidence: { table: tbl, a, b } })
            }
          }
        }
        // redundant prefix: if one index's columns is a prefix of another's
        for (let i = 0; i < indexes.length; i++) {
          for (let j = 0; j < indexes.length; j++) {
            if (i === j) continue
            const a = indexes[i], b = indexes[j]
            const aCols = a.columns.map(String)
            const bCols = b.columns.map(String)
            if (aCols.length < bCols.length && bCols.slice(0, aCols.length).join(',') === aCols.join(',')) {
              suggestions.push({ id: 'idx_redundant_prefix', level: 'should', action: `索引前缀冗余：${a.name} 被 ${b.name} 覆盖`, reason: `表 ${tbl} 中 ${a.name} 为 ${b.name} 的前缀，可考虑移除`, evidence: { table: tbl, redundant: a, covering: b } })
            }
          }
        }
      }
      return suggestions
    } catch {
      return []
    }
  }

  private async safeExplain(sql: string): Promise<any> {
    try {
      const connector: any = container.resolve(DATABASE_CONNECTOR)
      if (!connector?.getExplainPlan) return { note: 'EXPLAIN not available' }
      return await connector.getExplainPlan(sql)
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  private evidenceResource(payload: AdvisorEvidence) {
    return {
      type: 'resource' as const,
      resource: {
        uri: 'memory://advisor-evidence.json',
        mimeType: 'application/json',
        text: JSON.stringify(payload)
      }
    }
  }

  private analyzeSqlShape(sql: string) {
    const s = sql.replace(/\s+/g, ' ').trim()
    const lower = s.toLowerCase()
    const tables: string[] = []
    const joins: string[] = []
    const filters: string[] = []
    const joinKeys: string[] = []
    let orderBy: string | undefined
    let limit: string | undefined
    const selectAll = /select\s+\*/i.test(s)
    const aliasToTable: Record<string, string> = {}

    const fromAlias = lower.match(/from\s+([^\s,]+)\s+(?:as\s+)?([a-z_][a-z0-9_]*)/i)
    if (fromAlias) aliasToTable[fromAlias[2]] = fromAlias[1]

    const fromMatch = lower.match(/from\s+([^\s,]+)(?:\s+as\s+\w+|\s+\w+)?/)
    if (fromMatch) tables.push(fromMatch[1])
    const joinRegex = /join\s+([^\s]+)(?:\s+as\s+([a-z_][a-z0-9_]*)|\s+([a-z_][a-z0-9_]*))?\s+on\s+([^\s]+)\s*=\s*([^\s]+)/gi
    let m: RegExpExecArray | null
    while ((m = joinRegex.exec(lower))) {
      const tbl = m[1]; const alias = (m[2] || m[3])
      if (alias) aliasToTable[alias] = tbl
      tables.push(tbl); joins.push(`${tbl} ON ${m[4]} = ${m[5]}`)
      if (m[4] && m[5]) joinKeys.push(`${m[4]} = ${m[5]}`)
    }
    const whereMatch = s.match(/where\s+(.+?)(order\s+by|limit|$)/i)
    if (whereMatch) filters.push(whereMatch[1].trim())
    const orderMatch = s.match(/order\s+by\s+(.+?)(limit|$)/i)
    if (orderMatch) orderBy = orderMatch[1].trim()
    const limitMatch = s.match(/limit\s+\d+(?:\s*,\s*\d+)?/i)
    if (limitMatch) limit = limitMatch[0]

    return { tables, joins, filters, orderBy, limit, selectAll, joinKeys, aliasToTable }
  }
} 