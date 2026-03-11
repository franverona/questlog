import { describe, it, expect, vi } from 'vitest'
import { createTestApp, chainable } from './helpers.js'
import { webhooksRouter } from '../routes/webhooks.js'

function makeListDb(rows: WebhookRow[], total: number) {
  return {
    select: vi
      .fn()
      .mockReturnValueOnce(chainable(rows))
      .mockReturnValueOnce(chainable([{ count: total }])),
  }
}

function makeApp(db: unknown) {
  const app = createTestApp(db)
  app.route('/', webhooksRouter)
  return app
}

type WebhookRow = {
  id: string
  url: string
  createdAt: Date
}

type ListWebhooksResponse = {
  data: WebhookRow[]
  error: {
    message: string
    code: string
  } | null
  meta: null
}

describe('GET /v1/webhooks', () => {
  it('returns all webhooks', async () => {
    const rows: WebhookRow[] = [
      {
        id: 'webhook-1',
        url: 'https://webhook-1.com',
        createdAt: new Date(),
      },
      {
        id: 'webhook-2',
        url: 'https://webhook-2.com',
        createdAt: new Date(),
      },
      {
        id: 'webhook-3',
        url: 'https://webhook-3.com',
        createdAt: new Date(),
      },
    ]
    const db = makeListDb(rows, 42)
    const res = await makeApp(db).request('/')
    expect(res.status).toBe(200)
    const body = (await res.json()) as ListWebhooksResponse
    expect(body.meta).toBeNull()
    expect(body.data).toHaveLength(rows.length)
    expect(body.error).toBeNull()
  })
})
