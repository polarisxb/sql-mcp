import { describe, it, expect } from 'vitest'
import { PlanAnalyzer } from '../plan-analyzer.js'

describe('PlanAnalyzer', () => {
	it('detects filesort and full scan and summarizes nodes', () => {
		const plan = {
			query_block: {
				sorting_operation: { using_filesort: true },
				nested_loop: [
					{ table: { table_name: 't1', access_type: 'ALL', rows_examined_per_scan: 1000 } },
					{ table: { table_name: 't2', access_type: 'ref', rows_examined_per_scan: 10 } }
				]
			}
		}
		const analyzer = new PlanAnalyzer()
		const res = analyzer.analyze(plan as any)
		expect(res.flags.usingFilesort).toBe(true)
		expect(res.risks.find(r => r.id === 'filesort')).toBeTruthy()
		expect(res.risks.find(r => r.id === 'full_scan')).toBeTruthy()
		expect(res.summary.length).toBeGreaterThan(0)
	})
}) 