import { achievements, userEvents, userAchievements } from '@questlog/db'
import { sql } from 'drizzle-orm'
import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../types.js'
import { ErrorSchema } from '../openapi-components.js'

export const statsRouter = createRouter()

const statsRoute = createRoute({
  operationId: 'getStats',
  summary: 'Get platform statistics',
  method: 'get',
  path: '/',
  tags: ['stats'],
  security: [{ ApiKey: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              total_events: z.number().int().nonnegative().openapi({ example: 1042 }),
              total_achievements: z.number().int().nonnegative().openapi({ example: 12 }),
              total_users_with_achievements: z
                .number()
                .int()
                .nonnegative()
                .openapi({ example: 87 }),
            }),
            error: z.null(),
            meta: z.null(),
          }),
        },
      },
      description: 'Aggregate platform statistics',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

statsRouter.openapi(statsRoute, async (c) => {
  const db = c.get('db')

  const [[eventsRow], [achievementsRow], [usersRow]] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(userEvents),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(achievements),
    db
      .select({
        count: sql<number>`cast(count(distinct ${userAchievements.externalUserId}) as int)`,
      })
      .from(userAchievements),
  ])

  return c.json(
    {
      data: {
        total_events: eventsRow?.count ?? 0,
        total_achievements: achievementsRow?.count ?? 0,
        total_users_with_achievements: usersRow?.count ?? 0,
      },
      error: null,
      meta: null,
    },
    200,
  )
})
