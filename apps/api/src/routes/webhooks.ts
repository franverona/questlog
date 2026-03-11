import { webhooks } from '@questlog/db'
import { eq } from 'drizzle-orm'
import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../types.js'
import {
  ErrorSchema,
  WebhookEntryDbSchema,
  CreateWebhookOpenApiSchema,
  CreateWebhookResponseSchema,
} from '../openapi-components.js'
import crypto from 'node:crypto'

const IdParamSchema = z.object({ id: z.string() })

export const webhooksRouter = createRouter()

// ─── GET / ────────────────────────────────────────────────────────────────────

const listRoute = createRoute({
  operationId: 'listWebhooks',
  summary: 'List webhooks',
  method: 'get',
  path: '/',
  tags: ['webhooks'],
  security: [{ ApiKey: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(WebhookEntryDbSchema),
            error: z.null(),
            meta: z.null(),
          }),
        },
      },
      description: 'List of webhooks',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

webhooksRouter.openapi(listRoute, async (c) => {
  const db = c.get('db')
  const rows = await db
    .select({ id: webhooks.id, url: webhooks.url, createdAt: webhooks.createdAt })
    .from(webhooks)

  return c.json(
    {
      data: rows,
      error: null,
      meta: null,
    },
    200,
  )
})

// ─── POST / ───────────────────────────────────────────────────────────────────

const createWebhookRoute = createRoute({
  operationId: 'createWebhook',
  summary: 'Create webhook',
  method: 'post',
  path: '/',
  tags: ['webhooks'],
  security: [{ ApiKey: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateWebhookOpenApiSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({ data: CreateWebhookResponseSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Webhook created',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Validation error',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

webhooksRouter.openapi(createWebhookRoute, async (c) => {
  const db = c.get('db')
  const body = c.req.valid('json')

  const secret = crypto.randomBytes(32).toString('hex')

  const [row] = await db
    .insert(webhooks)
    .values({
      url: body.url,
      secret,
    })
    .returning()

  return c.json({ data: row, error: null, meta: null }, 201)
})

// ─── DELETE /{id} ─────────────────────────────────────────────────────────────

const deleteWebhookRoute = createRoute({
  operationId: 'deleteWebhook',
  summary: 'Delete webhook',
  method: 'delete',
  path: '/{id}',
  tags: ['webhooks'],
  security: [{ ApiKey: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: WebhookEntryDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Webhook deleted',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Webhook not found',
    },
  },
})

webhooksRouter.openapi(deleteWebhookRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')

  const [row] = await db.delete(webhooks).where(eq(webhooks.id, id)).returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Webhook not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})
