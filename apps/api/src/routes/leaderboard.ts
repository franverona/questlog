import { userAchievements, achievements } from '@questlog/db'
import { eq, sql, desc } from 'drizzle-orm'
import { createRouter } from '../types.js'

export const leaderboardRouter = createRouter()

leaderboardRouter.get('/', async (c) => {
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

  return c.json({ data: ranked, error: null, meta: null })
})
