import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { TrackEventSchema } from '@questlog/types'
import { userEvents } from '@questlog/db'
import type { Db } from '@questlog/db'
import { evaluateRules } from '../rule-engine.js'

type Env = { Variables: { db: Db } }

export const eventsRouter = new Hono<Env>()

eventsRouter.post('/track', zValidator('json', TrackEventSchema), async (c) => {
  const db = c.get('db')
  const { external_user_id, event_name, metadata } = c.req.valid('json')

  await db.insert(userEvents).values({
    externalUserId: external_user_id,
    eventName: event_name,
    metadata: metadata ?? {},
  })

  const newAchievements = await evaluateRules(external_user_id, db)

  return c.json({
    data: { tracked: true, achievements_unlocked: newAchievements },
    error: null,
    meta: null,
  })
})
