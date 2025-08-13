import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SqlTutorHandler } from '../sql-tutor.js'
import { container } from '../../../core/di/index.js'
import { DATABASE_CONNECTOR } from '../../../core/di/tokens.js'

describe('SqlTutorHandler', () => {
	const security = {
		validateReadOnlyQuery: vi.fn(),
		validateIdentifier: vi.fn()
	} as any

	beforeEach(() => {
		vi.spyOn(container, 'resolve').mockImplementation((token: any) => {
			if (token === DATABASE_CONNECTOR) {
				return {
					getExplainPlan: vi.fn(async () => ({
						query_block: {
							sorting_operation: {},
							nested_loop: [ { table: { table_name: 'p', access_type: 'index', rows_examined_per_scan: 5 } } ]
						}
					}
					))
				}
			}
			return undefined
		})
	})

	afterEach(() => vi.restoreAllMocks())

	it('explain returns text and advisor evidence', async () => {
		const tutor = new SqlTutorHandler(security)
		const res = await tutor.explain({ sql: 'SELECT * FROM products ORDER BY id LIMIT 5' })
		expect(res.content[0].type).toBe('text')
		const resource = res.content[1] as any
		expect(resource.type).toBe('resource')
		expect(resource.resource.mimeType).toBe('application/json')
		const payload = JSON.parse(resource.resource.text)
		expect(payload.plan).toBeTruthy()
		expect(payload.analysis.summary.length).toBeGreaterThan(0)
	})

	it('optimize returns suggestions and rewrites with evidence', async () => {
		const tutor = new SqlTutorHandler(security)
		const res = await tutor.optimize({ sql: 'SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 100' })
		expect(res.content[0].type).toBe('text')
		const text = (res.content[0] as any).text as string
		expect(text).toContain('优化建议')
		const resource = res.content[1] as any
		const payload = JSON.parse(resource.resource.text)
		expect(Array.isArray(payload.suggestions)).toBe(true)
		expect(Array.isArray(payload.rewrites)).toBe(true)
	})
}) 