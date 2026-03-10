import { describe, it, expect, vi } from 'vitest'
import { createTestApp, chainable } from './helpers.js'
import { rulesRouter } from '../routes/rules.js'
import { type Condition } from '@questlog/types'

function makeDb(row: RuleRow | null) {
  return {
    select: vi.fn().mockReturnValue(chainable(row ? [row] : [])),
  }
}

function makeListDb(rows: RuleRow[], total: number) {
  return {
    select: vi
      .fn()
      .mockReturnValueOnce(chainable(rows))
      .mockReturnValueOnce(chainable([{ count: total }])),
  }
}

function makeApp(db: unknown) {
  const app = createTestApp(db)
  app.route('/', rulesRouter)
  return app
}

type RuleRow = {
  id: string
  achievementId: string
  condition: Condition
  createdAt: Date
  achievementName: string
}

type RulesResponse = {
  data: RuleRow
  error: {
    message: string
    code: string
  } | null
  meta: null
}

type ListRulesResponse = {
  data: RuleRow[]
  error: {
    message: string
    code: string
  } | null
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}

describe('GET /v1/rules/:id', () => {
  it('returns rule by id', async () => {
    const createdAt = new Date()
    const db = makeDb({
      achievementId: 'achievement-1234',
      achievementName: 'Achievement name',
      condition: {
        event_name: 'example.event',
        threshold: 1,
        type: 'event_count',
      },
      createdAt,
      id: 'rule-1234',
    })
    const res = await makeApp(db).request('/rule-1234')
    expect(res.status).toBe(200)
    const body = (await res.json()) as RulesResponse
    expect(body).toEqual({
      data: {
        achievementId: 'achievement-1234',
        achievementName: 'Achievement name',
        condition: {
          event_name: 'example.event',
          threshold: 1,
          type: 'event_count',
        },
        createdAt: createdAt.toISOString(),
        id: 'rule-1234',
      },
      error: null,
      meta: null,
    })
  })

  it('returns 404 when rule does not exist', async () => {
    const db = makeDb(null)
    const res = await makeApp(db).request('/missing')
    expect(res.status).toBe(404)
    const body = (await res.json()) as RulesResponse
    expect(body.error?.code).toBe('NOT_FOUND')
  })
})

describe('GET /v1/rules', () => {
  it('returns paginated rules with correct meta', async () => {
    const rows: RuleRow[] = [
      {
        achievementId: 'achievement-1',
        achievementName: 'Achievement name',
        condition: {
          event_name: 'example.event',
          threshold: 1,
          type: 'event_count',
        },
        createdAt: new Date(),
        id: 'rule-1',
      },
      {
        achievementId: 'achievement-1',
        achievementName: 'Achievement name',
        condition: {
          event_name: 'example.event',
          threshold: 1,
          type: 'event_count',
        },
        createdAt: new Date(),
        id: 'rule-2',
      },
    ]
    const db = makeListDb(rows, 42)
    const res = await makeApp(db).request('/?page=2&perPage=10')
    expect(res.status).toBe(200)
    const body = (await res.json()) as ListRulesResponse
    expect(body.meta).toEqual({ total: 42, page: 2, perPage: 10, totalPages: 5 })
    expect(body.data).toHaveLength(rows.length)
    expect(body.error).toBeNull()
  })

  it('defaults to page 1 and perPage 20', async () => {
    const db = makeListDb([], 0)
    const res = await makeApp(db).request('/')
    const body = (await res.json()) as ListRulesResponse
    expect(body.meta).toMatchObject({ page: 1, perPage: 20 })
  })

  it('rejects perPage above 100', async () => {
    const db = makeListDb([], 0)
    const res = await makeApp(db).request('/?perPage=999')
    expect(res.status).toBe(400)
    const body = (await res.json()) as ListRulesResponse
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })
})
