export interface RateLimitOptions {
  windowMs: number
  max: number
  perIpMax: number
}

type Counter = { count: number; expiresAt: number }

export function createRateLimitMiddleware(opts: RateLimitOptions) {
  const globalCounter: Counter = { count: 0, expiresAt: Date.now() + opts.windowMs }
  const perIpCounters = new Map<string, Counter>()

  const resetIfNeeded = (counter: Counter) => {
    const now = Date.now()
    if (now >= counter.expiresAt) {
      counter.count = 0
      counter.expiresAt = now + opts.windowMs
    }
  }

  return function rateLimit(req: any, res: any, next: any) {
    // Global
    resetIfNeeded(globalCounter)
    if (globalCounter.count >= opts.max) {
      res.status(429).json({ error: 'Too Many Requests' })
      return
    }

    // Per IP
    const ip = (req.ip || (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown') as string
    let ipCounter = perIpCounters.get(ip)
    if (!ipCounter) {
      ipCounter = { count: 0, expiresAt: Date.now() + opts.windowMs }
      perIpCounters.set(ip, ipCounter)
    }
    resetIfNeeded(ipCounter)
    if (ipCounter.count >= opts.perIpMax) {
      res.status(429).json({ error: 'Too Many Requests' })
      return
    }

    // Increment and continue
    globalCounter.count += 1
    ipCounter.count += 1
    next()
  }
} 