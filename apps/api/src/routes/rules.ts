import { rules, achievements } from '@questlog/db'
import { eq, sql } from 'drizzle-orm'
import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../types.js'
import {
  RuleWithNameDbSchema,
  RuleDbSchema,
  CreateRuleOpenAPISchema,
  ErrorSchema,
  PaginationMetaSchema,
  PaginationQuerySchema,
} from '../openapi-components.js'
import { parsePagination, totalPages } from '../lib/pagination.js'

const IdParamSchema = z.object({ id: z.string() })

export const rulesRouter = createRouter()

// ─── GET / ────────────────────────────────────────────────────────────────────

const listRoute = createRoute({
  operationId: 'listRules',
  summary: 'List rules',
  method: 'get',
  path: '/',
  request: { query: PaginationQuerySchema },
  tags: ['rules'],
  security: [{ ApiKey: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(RuleWithNameDbSchema),
            error: z.null(),
            meta: PaginationMetaSchema,
          }),
        },
      },
      description: 'List of rules',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

rulesRouter.openapi(listRoute, async (c) => {
  const db = c.get('db')
  const { page, perPage, offset } = parsePagination(c.req.valid('query'))
  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: rules.id,
        achievementId: rules.achievementId,
        condition: rules.condition,
        createdAt: rules.createdAt,
        achievementName: achievements.name,
      })
      .from(rules)
      .innerJoin(achievements, eq(rules.achievementId, achievements.id))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(rules)
      .innerJoin(achievements, eq(rules.achievementId, achievements.id)),
  ])

  return c.json(
    {
      data: rows,
      error: null,
      meta: {
        total: count,
        page,
        perPage,
        totalPages: totalPages(count, perPage),
      },
    },
    200,
  )
})

// ─── GET /{id} ────────────────────────────────────────────────────────────────

const getRoute = createRoute({
  operationId: 'getRule',
  summary: 'Get rule by ID',
  method: 'get',
  path: '/{id}',
  tags: ['rules'],
  security: [{ ApiKey: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: RuleWithNameDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Rule details',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Rule not found',
    },
  },
})

rulesRouter.openapi(getRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')

  const [row] = await db
    .select({
      id: rules.id,
      achievementId: rules.achievementId,
      condition: rules.condition,
      createdAt: rules.createdAt,
      achievementName: achievements.name,
    })
    .from(rules)
    .innerJoin(achievements, eq(rules.achievementId, achievements.id))
    .where(eq(rules.id, id))

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Rule not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})

// ─── POST / ───────────────────────────────────────────────────────────────────

const createRuleRoute = createRoute({
  operationId: 'createRule',
  summary: 'Create rule',
  method: 'post',
  path: '/',
  tags: ['rules'],
  security: [{ ApiKey: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateRuleOpenAPISchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({ data: RuleDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Rule created',
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

rulesRouter.openapi(createRuleRoute, async (c) => {
  const db = c.get('db')
  const body = c.req.valid('json')

  const [row] = await db
    .insert(rules)
    .values({
      achievementId: body.achievementId,
      condition: body.condition,
    })
    .returning()

  return c.json({ data: row, error: null, meta: null }, 201)
})

// ─── PUT /{id} ────────────────────────────────────────────────────────────────

const updateRuleRoute = createRoute({
  operationId: 'updateRule',
  summary: 'Update rule',
  method: 'put',
  path: '/{id}',
  tags: ['rules'],
  security: [{ ApiKey: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: { 'application/json': { schema: CreateRuleOpenAPISchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: RuleDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Rule updated',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Validation error',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Rule not found',
    },
  },
})

rulesRouter.openapi(updateRuleRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')

  const [row] = await db
    .update(rules)
    .set({
      achievementId: body.achievementId,
      condition: body.condition,
    })
    .where(eq(rules.id, id))
    .returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Rule not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})

// ─── DELETE /{id} ─────────────────────────────────────────────────────────────

const deleteRuleRoute = createRoute({
  operationId: 'deleteRule',
  summary: 'Delete rule',
  method: 'delete',
  path: '/{id}',
  tags: ['rules'],
  security: [{ ApiKey: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: RuleDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Rule deleted',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Rule not found',
    },
  },
})

rulesRouter.openapi(deleteRuleRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')

  const [row] = await db.delete(rules).where(eq(rules.id, id)).returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Rule not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})
