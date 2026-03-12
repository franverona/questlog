import { userAchievements, userEvents, achievements, rules } from '@questlog/db'
import { eq, desc, sql } from 'drizzle-orm'
import { createRoute, z } from '@hono/zod-openapi'
import type { Condition } from '@questlog/types'
import { createRouter } from '../types.js'
import {
  AchievementDbSchema,
  ProgressItemDbSchema,
  UserEventDbSchema,
  ErrorSchema,
  PaginationMetaSchema,
  PaginationQuerySchema,
} from '../openapi-components.js'
import { parsePagination, totalPages } from '../lib/pagination.js'

const UserIdParamSchema = z.object({ userId: z.string().min(1) })

export const usersRouter = createRouter()

// ─── GET /{userId}/achievements ───────────────────────────────────────────────

const userAchievementsRoute = createRoute({
  operationId: 'getUserAchievements',
  summary: 'Get user achievements',
  method: 'get',
  path: '/{userId}/achievements',
  tags: ['users'],
  security: [{ ApiKey: [] }],
  request: { params: UserIdParamSchema, query: PaginationQuerySchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(AchievementDbSchema),
            error: z.null(),
            meta: PaginationMetaSchema,
          }),
        },
      },
      description: "User's unlocked achievements",
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

usersRouter.openapi(userAchievementsRoute, async (c) => {
  const db = c.get('db')
  const { page, perPage, offset } = parsePagination(c.req.valid('query'))
  const { userId } = c.req.valid('param')

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: achievements.id,
        name: achievements.name,
        description: achievements.description,
        iconUrl: achievements.iconUrl,
        points: achievements.points,
        createdAt: achievements.createdAt,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.externalUserId, userId))
      .orderBy(desc(userAchievements.unlockedAt))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.externalUserId, userId)),
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

// ─── GET /{userId}/progress ───────────────────────────────────────────────────

const userProgressRoute = createRoute({
  operationId: 'getUserProgress',
  summary: 'Get user progress',
  method: 'get',
  path: '/{userId}/progress',
  tags: ['users'],
  security: [{ ApiKey: [] }],
  request: { params: UserIdParamSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              unlocked: z.array(AchievementDbSchema),
              progress: z.array(ProgressItemDbSchema),
            }),
            error: z.null(),
            meta: z.null(),
          }),
        },
      },
      description: "User's unlocked achievements and progress toward locked ones",
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

usersRouter.openapi(userProgressRoute, async (c) => {
  const db = c.get('db')
  const { userId } = c.req.valid('param')

  const unlockedRows = await db
    .select({
      id: achievements.id,
      name: achievements.name,
      description: achievements.description,
      iconUrl: achievements.iconUrl,
      points: achievements.points,
      createdAt: achievements.createdAt,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.externalUserId, userId))

  const unlockedIds = new Set(unlockedRows.map((r) => r.id))

  const eventRows = await db
    .select({ eventName: userEvents.eventName, createdAt: userEvents.createdAt })
    .from(userEvents)
    .where(eq(userEvents.externalUserId, userId))

  const allRules = await db
    .select({
      achievementId: rules.achievementId,
      achievementName: achievements.name,
      achievementIconUrl: achievements.iconUrl,
      condition: rules.condition,
    })
    .from(rules)
    .innerJoin(achievements, eq(rules.achievementId, achievements.id))

  const progressMap = new Map<
    string,
    {
      achievementId: string
      achievementName: string
      achievementIconUrl: string | null
      currentCount: number
      threshold: number
      percent: number
    }
  >()

  for (const rule of allRules) {
    if (unlockedIds.has(rule.achievementId)) continue
    const condition = rule.condition as Condition
    extractProgress(
      condition,
      rule.achievementId,
      rule.achievementName,
      rule.achievementIconUrl,
      eventRows,
      progressMap,
    )
  }

  return c.json(
    {
      data: { unlocked: unlockedRows, progress: [...progressMap.values()] },
      error: null,
      meta: null,
    },
    200,
  )
})

// ─── GET /{userId}/events ─────────────────────────────────────────────────────

const userEventsRoute = createRoute({
  operationId: 'getUserEvents',
  summary: 'Get user events',
  method: 'get',
  path: '/{userId}/events',
  tags: ['users'],
  security: [{ ApiKey: [] }],
  request: { params: UserIdParamSchema, query: PaginationQuerySchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(UserEventDbSchema),
            error: z.null(),
            meta: PaginationMetaSchema,
          }),
        },
      },
      description: 'Last events for the user',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

usersRouter.openapi(userEventsRoute, async (c) => {
  const db = c.get('db')
  const { userId } = c.req.valid('param')
  const { page, perPage, offset } = parsePagination(c.req.valid('query'))

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(userEvents)
      .where(eq(userEvents.externalUserId, userId))
      .orderBy(desc(userEvents.createdAt))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(userEvents)
      .where(eq(userEvents.externalUserId, userId)),
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

function extractProgress(
  condition: Condition,
  achievementId: string,
  achievementName: string,
  achievementIconUrl: string | null,
  events: { eventName: string; createdAt: Date }[],
  map: Map<
    string,
    {
      achievementId: string
      achievementName: string
      achievementIconUrl: string | null
      currentCount: number
      threshold: number
      percent: number
    }
  >,
) {
  if (condition.type === 'event_count') {
    const current = events.filter((e) => e.eventName === condition.event_name).length
    const threshold = condition.threshold
    const percent = Math.min(100, Math.round((current / threshold) * 100))
    const existing = map.get(achievementId)
    if (!existing || percent > existing.percent) {
      map.set(achievementId, {
        achievementId: achievementId,
        achievementName: achievementName,
        achievementIconUrl: achievementIconUrl,
        currentCount: current,
        threshold,
        percent,
      })
    }
  } else if (condition.type === 'combination') {
    for (const c of condition.conditions) {
      extractProgress(c, achievementId, achievementName, achievementIconUrl, events, map)
    }
  }
}
