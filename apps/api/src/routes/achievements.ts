import { achievements } from '@questlog/db'
import { eq } from 'drizzle-orm'
import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../types.js'
import {
  AchievementDbSchema,
  CreateAchievementOpenAPISchema,
  ErrorSchema,
} from '../openapi-components.js'

const IdParamSchema = z.object({ id: z.string() })

export const achievementsRouter = createRouter()

// ─── GET / ────────────────────────────────────────────────────────────────────

const listRoute = createRoute({
  operationId: 'listAchievements',
  summary: 'List achievements',
  method: 'get',
  path: '/',
  tags: ['achievements'],
  security: [{ ApiKey: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(AchievementDbSchema),
            error: z.null(),
            meta: z.object({ total: z.number().int() }),
          }),
        },
      },
      description: 'List of achievements',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

achievementsRouter.openapi(listRoute, async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(achievements)
  return c.json({ data: rows, error: null, meta: { total: rows.length } }, 200)
})

// ─── GET /{id} ────────────────────────────────────────────────────────────────

const getRoute = createRoute({
  operationId: 'getAchievement',
  summary: 'Get achievement by ID',
  method: 'get',
  path: '/{id}',
  tags: ['achievements'],
  security: [{ ApiKey: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: AchievementDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Achievement details',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Achievement not found',
    },
  },
})

achievementsRouter.openapi(getRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')
  const [row] = await db.select().from(achievements).where(eq(achievements.id, id))

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Achievement not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})

// ─── POST / ───────────────────────────────────────────────────────────────────

const createAchievementRoute = createRoute({
  operationId: 'createAchievement',
  summary: 'Create achievement',
  method: 'post',
  path: '/',
  tags: ['achievements'],
  security: [{ ApiKey: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: CreateAchievementOpenAPISchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({ data: AchievementDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Achievement created',
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

achievementsRouter.openapi(createAchievementRoute, async (c) => {
  const db = c.get('db')
  const body = c.req.valid('json')

  const [row] = await db
    .insert(achievements)
    .values({
      name: body.name,
      description: body.description,
      iconUrl: body.iconUrl || null,
      points: body.points,
    })
    .returning()

  return c.json({ data: row, error: null, meta: null }, 201)
})

// ─── PUT /{id} ────────────────────────────────────────────────────────────────

const updateAchievementRoute = createRoute({
  operationId: 'updateAchievement',
  summary: 'Update achievement',
  method: 'put',
  path: '/{id}',
  tags: ['achievements'],
  security: [{ ApiKey: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: { 'application/json': { schema: CreateAchievementOpenAPISchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: AchievementDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Achievement updated',
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
      description: 'Achievement not found',
    },
  },
})

achievementsRouter.openapi(updateAchievementRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')
  const body = c.req.valid('json')

  const [row] = await db
    .update(achievements)
    .set({
      name: body.name,
      description: body.description,
      iconUrl: body.iconUrl || null,
      points: body.points,
    })
    .where(eq(achievements.id, id))
    .returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Achievement not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})

// ─── DELETE /{id} ─────────────────────────────────────────────────────────────

const deleteAchievementRoute = createRoute({
  operationId: 'deleteAchievement',
  summary: 'Delete achievement',
  method: 'delete',
  path: '/{id}',
  tags: ['achievements'],
  security: [{ ApiKey: [] }],
  request: { params: IdParamSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ data: AchievementDbSchema, error: z.null(), meta: z.null() }),
        },
      },
      description: 'Achievement deleted',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Achievement not found',
    },
  },
})

achievementsRouter.openapi(deleteAchievementRoute, async (c) => {
  const db = c.get('db')
  const { id } = c.req.valid('param')

  const [row] = await db.delete(achievements).where(eq(achievements.id, id)).returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Achievement not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null }, 200)
})
