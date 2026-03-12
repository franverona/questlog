import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestApp, chainable } from './helpers.js'
import crypto from 'node:crypto'
import { webhooksRouter } from '../routes/webhooks.js'

type WebhookRow = {
  id: string
  url: string
  createdAt: Date
}

type CreateWebhookRow = WebhookRow & {
  secret: string
}

type ListWebhooksResponse = {
  data: WebhookRow[]
  error: {
    message: string
    code: string
  } | null
  meta: null
}

type CreateWebhookResponse = {
  data: CreateWebhookRow
  error: {
    message: string
    code: string
  } | null
  meta: null
}

type DeleteWebhookResponse = {
  data: WebhookRow
  error: {
    message: string
    code: string
  } | null
  meta: null
}

function makeListDb(rows: WebhookRow[]) {
  return {
    select: vi.fn().mockReturnValueOnce(chainable(rows)),
  }
}

function makeCreateDb(rows: CreateWebhookRow[]) {
  return {
    insert: vi.fn().mockReturnValueOnce(chainable(rows)),
  }
}

function makeDeleteDb(rows: WebhookRow[]) {
  return {
    delete: vi.fn().mockReturnValueOnce(chainable(rows)),
  }
}

function makeApp(db: unknown) {
  const app = createTestApp(db)
  app.route('/', webhooksRouter)
  return app
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
    const db = makeListDb(rows)
    const res = await makeApp(db).request('/')
    expect(res.status).toBe(200)
    const body = (await res.json()) as ListWebhooksResponse
    expect(body.meta).toBeNull()
    expect(body.data).toHaveLength(rows.length)
    expect(body.error).toBeNull()
  })
})

describe('POST /v1/webhooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates new webhook', async () => {
    const secret = 'a'.repeat(64)
    const url = 'https://example.com'

    vi.spyOn(crypto, 'randomBytes').mockReturnValue(
      Buffer.from(secret, 'hex') as unknown as ReturnType<typeof crypto.randomBytes>,
    )

    const row: CreateWebhookRow = {
      id: 'c1d2e3f4-a5b6-7890-cdef-012345678901',
      url,
      secret,
      createdAt: new Date(),
    }
    const db = makeCreateDb([row])
    const res = await makeApp(db).request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as CreateWebhookResponse
    expect(body.meta).toBeNull()
    expect(body.data).toHaveProperty('secret', secret)
    expect(body.data).toHaveProperty('url', url)
    expect(body.error).toBeNull()
  })

  it('returns 409 when URL already exists', async () => {
    const dbError = Object.assign(new Error('duplicate key'), { code: '23505' })
    const db = {
      insert: vi.fn().mockReturnValueOnce(chainable(Promise.reject(dbError))),
    }
    const res = await makeApp(db).request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as CreateWebhookResponse
    expect(body.data).toBeNull()
    expect(body.error).toHaveProperty('code', 'CONFLICT')
    expect(body.error).toHaveProperty('message', 'A webhook for this URL already exists')
  })
})

describe('DELETE /v1/webhooks/:id', () => {
  it('deletes a webhook and returns it', async () => {
    const row: WebhookRow = {
      id: 'c1d2e3f4-a5b6-7890-cdef-012345678901',
      url: 'https://example.com',
      createdAt: new Date(),
    }
    const db = makeDeleteDb([row])
    const res = await makeApp(db).request('/c1d2e3f4-a5b6-7890-cdef-012345678901', {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as DeleteWebhookResponse
    expect(body.data).toHaveProperty('id', row.id)
    expect(body.data).toHaveProperty('url', row.url)
    expect(body.error).toBeNull()
    expect(body.meta).toBeNull()
  })

  it('returns 404 when webhook does not exist', async () => {
    const db = makeDeleteDb([])
    const res = await makeApp(db).request('/c1d2e3f4-a5b6-7890-cdef-012345678901', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const body = (await res.json()) as DeleteWebhookResponse
    expect(body.data).toBeNull()
    expect(body.error).toHaveProperty('code', 'NOT_FOUND')
    expect(body.error).toHaveProperty('message', 'Webhook not found')
  })
})
