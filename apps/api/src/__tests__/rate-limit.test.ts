import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { rateLimit } from '../middleware/rate-limit.js'

function makeApp(limit: number, windowMs: number) {
  const app = new Hono()
  app.use('*', rateLimit(limit, windowMs))
  app.get('/', (c) => c.json({ data: 'ok', error: null, meta: null }))
  return app
}

async function req(app: Hono, apiKey?: string) {
  const headers: Record<string, string> = apiKey ? { 'x-api-key': apiKey } : {}
  return app.request('/', { headers })
}

describe('rateLimit middleware', () => {
  it('allows requests under the limit', async () => {
    const app = makeApp(3, 60_000)

    for (let i = 0; i < 3; i++) {
      const res = await req(app, 'key-a')
      expect(res.status).toBe(200)
    }
  })

  it('blocks the request that exceeds the limit with 429', async () => {
    const app = makeApp(3, 60_000)

    for (let i = 0; i < 3; i++) {
      await req(app, 'key-b')
    }

    const res = await req(app, 'key-b')
    expect(res.status).toBe(429)
    const body = (await res.json()) as { error: { message: string; code: string } }
    expect(body.error.code).toBe('RATE_LIMITED')
  })

  it('tracks limits independently per API key', async () => {
    const app = makeApp(2, 60_000)

    await req(app, 'key-c')
    await req(app, 'key-c')
    const blockedRes = await req(app, 'key-c')
    expect(blockedRes.status).toBe(429)

    // different key should still be allowed
    const allowedRes = await req(app, 'key-d')
    expect(allowedRes.status).toBe(200)
  })

  it('sets standard rate limit response headers', async () => {
    const app = makeApp(10, 60_000)
    const res = await req(app, 'key-e')

    expect(res.headers.get('RateLimit-Limit')).toBeTruthy()
    expect(res.headers.get('RateLimit-Remaining')).toBeTruthy()
  })
})
