import { describe, it, expect, vi } from 'vitest'
import { createTestApp, chainable } from './helpers.js'
import { statsRouter } from '../routes/stats.js'

function makeDb(counts: { events: number; achievements: number; users: number }) {
  return {
    select: vi
      .fn()
      .mockReturnValueOnce(chainable([{ count: counts.events }]))
      .mockReturnValueOnce(chainable([{ count: counts.achievements }]))
      .mockReturnValueOnce(chainable([{ count: counts.users }])),
  }
}

function makeApp(db: unknown) {
  const app = createTestApp(db)
  app.route('/', statsRouter)
  return app
}

type StatsResponse = {
  data: { total_events: number; total_achievements: number; total_users_with_achievements: number }
  error: null
  meta: null
}

describe('GET /v1/stats', () => {
  it('returns correct counts', async () => {
    const db = makeDb({ events: 42, achievements: 10, users: 7 })
    const res = await makeApp(db).request('/')
    expect(res.status).toBe(200)
    const body = (await res.json()) as StatsResponse
    expect(body).toEqual({
      data: {
        total_events: 42,
        total_achievements: 10,
        total_users_with_achievements: 7,
      },
      error: null,
      meta: null,
    })
  })

  it('returns 0 when all counts are zero', async () => {
    const db = makeDb({ events: 0, achievements: 0, users: 0 })
    const res = await makeApp(db).request('/')
    expect(res.status).toBe(200)
    const body = (await res.json()) as StatsResponse
    expect(body.data).toEqual({
      total_events: 0,
      total_achievements: 0,
      total_users_with_achievements: 0,
    })
  })

  it('falls back to 0 when a query returns no rows', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainable([]))
        .mockReturnValueOnce(chainable([{ count: 5 }]))
        .mockReturnValueOnce(chainable([{ count: 3 }])),
    }
    const res = await makeApp(db).request('/')
    const body = (await res.json()) as StatsResponse
    expect(body.data.total_events).toBe(0)
    expect(body.data.total_achievements).toBe(5)
    expect(body.data.total_users_with_achievements).toBe(3)
  })

  it('falls back to 0 when a query returns null count', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainable([{ count: null }]))
        .mockReturnValueOnce(chainable([{ count: 5 }]))
        .mockReturnValueOnce(chainable([{ count: 3 }])),
    }
    const res = await makeApp(db).request('/')
    const body = (await res.json()) as StatsResponse
    expect(body.data.total_events).toBe(0)
    expect(body.data.total_achievements).toBe(5)
    expect(body.data.total_users_with_achievements).toBe(3)
  })
})
