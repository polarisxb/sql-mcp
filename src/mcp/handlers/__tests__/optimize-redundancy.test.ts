import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SqlTutorHandler } from '../sql-tutor.js'
import { container } from '../../../core/di/index.js'
import { DATABASE_CONNECTOR, METADATA_SERVICE } from '../../../core/di/tokens.js'

describe('SqlTutorHandler - redundant/duplicate index suggestions', () => {
  const security = {
    validateReadOnlyQuery: vi.fn(),
    validateIdentifier: vi.fn()
  } as any

  beforeEach(() => {
    vi.spyOn(container, 'resolve').mockImplementation((token: any) => {
      if (token === DATABASE_CONNECTOR) {
        return {
          getExplainPlan: vi.fn(async () => ({ query_block: {} }))
        }
      }
      if (token === METADATA_SERVICE) {
        return {
          getTableSchema: vi.fn(async (table: string) => ({
            name: table,
            columns: [],
            indexes: [
              { name: 'idx_a', columns: ['col1'], isUnique: false },
              { name: 'idx_b', columns: ['col1'], isUnique: false }, // duplicate
              { name: 'idx_c', columns: ['col1', 'col2'], isUnique: false } // covers idx_a
            ]
          })),
          getTables: vi.fn(async () => ['t1'])
        }
      }
      return undefined
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('optimize emits duplicate and redundant prefix index suggestions', async () => {
    const tutor = new SqlTutorHandler(security)
    const res = await tutor.optimize({ sql: 'SELECT * FROM t1 WHERE col1 = 1 ORDER BY col2' })
    const resource = res.content[1] as any
    expect(resource.type).toBe('resource')
    const payload = JSON.parse(resource.resource.text)
    const ids = (payload.suggestions as any[]).map(s => s.id)
    expect(ids).toContain('idx_duplicate')
    expect(ids).toContain('idx_redundant_prefix')
  })
}) 