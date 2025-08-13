import { describe, it, expect } from 'vitest'
import { QueryRewriter } from '../query-rewriter.js'

describe('QueryRewriter', () => {
  const rw = new QueryRewriter()

  it('suggests avoiding SELECT *', () => {
    const res = rw.rewrite('SELECT * FROM t ORDER BY id LIMIT 10')
    const ok = res.some(r => (r.sql || '').includes('指定必要列') || (r.description || '').includes('避免 SELECT *'))
    expect(ok).toBeTruthy()
  })

  it('suggests keyset pagination when OFFSET used with ORDER', () => {
    const res = rw.rewrite('SELECT id FROM t ORDER BY id LIMIT 20 OFFSET 100')
    expect(res.find(r => /Keyset Pagination/.test(r.description))).toBeTruthy()
  })

  it('warns leading wildcard LIKE', () => {
    const res = rw.rewrite("SELECT * FROM t WHERE name LIKE '%abc'")
    expect(res.find(r => /前导通配符/.test(r.description || ''))).toBeTruthy()
  })

  it('suggests sargable rewrite for function-wrapped columns', () => {
    const res = rw.rewrite('SELECT * FROM t WHERE DATE(created_at)=CURRENT_DATE()')
    expect(res.find(r => /SARGable/.test(r.description) || /WHERE DATE/.test(r.sql || ''))).toBeTruthy()
  })
}) 