import { createRoute, z } from '@hono/zod-openapi'
import { userEvents } from '@questlog/db'
import { evaluateRules } from '../rule-engine.js'
import { createRouter } from '../types.js'
import {
  TrackEventOpenAPISchema,
  UnlockedAchievementSchema,
  ErrorSchema,
} from '../openapi-components.js'

export const eventsRouter = createRouter()

const trackRoute = createRoute({
  operationId: 'trackEvent',
  summary: 'Track user event',
  method: 'post',
  path: '/track',
  tags: ['events'],
  security: [{ ApiKey: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: TrackEventOpenAPISchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              tracked: z.boolean(),
              achievements_unlocked: z.array(UnlockedAchievementSchema),
            }),
            error: z.null(),
            meta: z.null(),
          }),
        },
      },
      description: 'Event tracked; returns any newly unlocked achievements',
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

eventsRouter.openapi(trackRoute, async (c) => {
  const db = c.get('db')
  const { external_user_id, event_name, metadata } = c.req.valid('json')

  await db.insert(userEvents).values({
    externalUserId: external_user_id,
    eventName: event_name,
    metadata: metadata ?? {},
  })

  const newAchievements = await evaluateRules(external_user_id, db)

  return c.json(
    { data: { tracked: true, achievements_unlocked: newAchievements }, error: null, meta: null },
    200,
  )
})
