export interface RewriteSuggestion {
	description: string
	sql?: string
}

export class QueryRewriter {
	rewrite(sql: string): RewriteSuggestion[] {
		const suggestions: RewriteSuggestion[] = []
		const s = sql.trim()
		const lower = s.toLowerCase()

		// 1) SELECT * → select explicit columns (placeholder)
		if (/select\s+\*/i.test(s)) {
			suggestions.push({
				description: '避免 SELECT *，仅选择必要列（可配合覆盖索引）',
				sql: s.replace(/select\s+\*/i, 'SELECT /* 指定必要列 */ id, name')
			})
		}

		// 2) OFFSET/LIMIT → keyset pagination template if ORDER BY exists
		const hasOrder = /order\s+by\s+([^\s,]+)/i.exec(s)
		const hasOffset = /offset\s+\d+/i.test(s) || /limit\s+\d+\s*,\s*\d+/i.test(s)
		if (hasOrder && hasOffset) {
			const orderCol = hasOrder![1]
			suggestions.push({
				description: '用 Keyset Pagination 替代 OFFSET，基于上次游标更高效稳定',
				sql: `-- 模板\n/* 上一页最后一条的 ${orderCol} 作为游标 */\nSELECT /* 列 */ *\nFROM ( /* 原查询的 FROM/WHERE 子句 */ ) t\nWHERE ${orderCol} > ?\nORDER BY ${orderCol}\nLIMIT  ?` 
			})
		}

		// 3) leading wildcard LIKE → avoid
		const likeLeading = /like\s+'%[^']*'/i.test(lower)
		if (likeLeading) {
			suggestions.push({
				description: "避免前导通配符的 LIKE '%xxx'（无法利用索引）。可改为后缀通配、前缀索引、倒排搜索或全文索引。"
			})
		}

		// 4) function-wrapped columns in WHERE → sargable
		if (/where[\s\S]*\b[a-z_]+\s*\(/i.test(lower)) {
			suggestions.push({
				description: 'WHERE 子句中避免对列做函数/计算，改为等价可索引表达式（SARGable）',
				sql: '-- 例：WHERE DATE(created_at) = ? → WHERE created_at >= ? AND created_at < ?'
			})
		}

		return suggestions
	}
} 