// NOTE: This in-memory store does not persist across restarts and does not
// work across multiple API instances. For production multi-instance deployments,
// replace the store with a Redis-backed adapter (e.g. @hono-rate-limiter/redis).
import { rateLimiter } from 'hono-rate-limiter'

export function rateLimit(limit: number, windowMs: number) {
  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: 'draft-6',
    keyGenerator: (c) =>
      c.req.header('x-api-key') ?? c.req.header('x-forwarded-for') ?? 'anonymous',
    handler: (c) =>
      c.json(
        {
          data: null,
          error: { message: 'Too many requests', code: 'RATE_LIMITED' },
          meta: null,
        },
        429,
      ),
  })
}
