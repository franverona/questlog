import { describe, it, expect, vi } from 'vitest'
import { createTestApp } from './helpers.js'
import { rulesRouter } from '../routes/rules.js'
import { type Condition } from '@questlog/types'

function makeDb(row: RuleRow | null) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(row ? [row] : []),
        }),
      }),
    }),
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
