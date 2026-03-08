import { Hono } from 'hono'
import type { Db } from '@questlog/db'
import { achievements, userEvents, userAchievements } from '@questlog/db'
import { sql } from 'drizzle-orm'

type Env = { Variables: { db: Db } }

export const statsRouter = new Hono<Env>()

statsRouter.get('/', async (c) => {
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

  return c.json({
    data: {
      total_events: eventsRow?.count ?? 0,
      total_achievements: achievementsRow?.count ?? 0,
      total_users_with_achievements: usersRow?.count ?? 0,
    },
    error: null,
    meta: null,
  })
})
