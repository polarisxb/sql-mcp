import { describe, test, expect } from 'vitest'
import { createRateLimitMiddleware } from '../rate-limit.js'

function mockReq(ip?: string) {
  return { ip, headers: {}, socket: {} } as any
}
function mockRes() {
  const res: any = {}
  res.status = (code: number) => { res.code = code; return res }
  res.json = (obj: any) => { res.body = obj; return res }
  res.end = () => res
  return res
}

describe('rate limit middleware', () => {
  test('allows under limit and blocks over per-IP limit', async () => {
    const mw = createRateLimitMiddleware({ windowMs: 1000, max: 10, perIpMax: 2 })
    const next = () => {}

    const r1 = mockRes(); mw(mockReq('1.1.1.1'), r1, next)
    const r2 = mockRes(); mw(mockReq('1.1.1.1'), r2, next)
    expect(r1.code).toBeUndefined()
    expect(r2.code).toBeUndefined()

    const r3 = mockRes(); mw(mockReq('1.1.1.1'), r3, next)
    expect(r3.code).toBe(429)
  })

  test('blocks when global max exceeded', async () => {
    const mw = createRateLimitMiddleware({ windowMs: 1000, max: 1, perIpMax: 10 })
    const next = () => {}
    const r1 = mockRes(); mw(mockReq('2.2.2.2'), r1, next)
    const r2 = mockRes(); mw(mockReq('3.3.3.3'), r2, next)
    expect(r1.code).toBeUndefined()
    expect(r2.code).toBe(429)
  })
}) 