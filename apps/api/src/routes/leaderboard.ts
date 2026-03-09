import { userAchievements, achievements } from '@questlog/db'
import { eq, sql, desc } from 'drizzle-orm'
import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../types.js'
import { LeaderboardEntryDbSchema, ErrorSchema } from '../openapi-components.js'

export const leaderboardRouter = createRouter()

const leaderboardRoute = createRoute({
  operationId: 'getLeaderboard',
  summary: 'Get leaderboard',
  method: 'get',
  path: '/',
  tags: ['leaderboard'],
  security: [{ ApiKey: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(LeaderboardEntryDbSchema),
            error: z.null(),
            meta: z.null(),
          }),
        },
      },
      description: 'Top 20 users ranked by total achievement points',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Missing or invalid API key',
    },
  },
})

leaderboardRouter.openapi(leaderboardRoute, async (c) => {
  const db = c.get('db')

  const rows = await db
    .select({
      external_user_id: userAchievements.externalUserId,
      total_points: sql<number>`cast(sum(${achievements.points}) as int)`,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .groupBy(userAchievements.externalUserId)
    .orderBy(desc(sql`sum(${achievements.points})`))
    .limit(20)

  const ranked = rows.map((row, i) => ({
    rank: i + 1,
    external_user_id: row.external_user_id,
    total_points: row.total_points,
  }))

  return c.json({ data: ranked, error: null, meta: null }, 200)
})
