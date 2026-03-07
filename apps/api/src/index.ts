import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createDb } from '@questlog/db'
import { apiKeyAuth } from './middleware/auth.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestLogger } from './middleware/logger.js'
import { eventsRouter } from './routes/events.js'
import { usersRouter } from './routes/users.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { achievementsRouter } from './routes/achievements.js'
import { rulesRouter } from './routes/rules.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

const db = createDb(databaseUrl)

type Env = { Variables: { db: ReturnType<typeof createDb> } };

const app = new Hono<Env>()

// Global middleware
app.use('*', requestLogger())
app.use('*', async (c, next) => {
  c.set('db', db)
  await next()
})

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok' }))

// Authenticated v1 routes
const v1 = new Hono<Env>()
v1.use('*', apiKeyAuth())

v1.route('/events', eventsRouter)
v1.route('/users', usersRouter)
v1.route('/leaderboard', leaderboardRouter)
v1.route('/achievements', achievementsRouter)
v1.route('/rules', rulesRouter)

app.route('/v1', v1)

// Error handler
app.onError(errorHandler)

// 404 handler
app.notFound((c) =>
  c.json(
    { data: null, error: { message: 'Not found', code: 'NOT_FOUND' }, meta: null },
    404
  )
)

const port = parseInt(process.env.PORT ?? '3001', 10)

console.log(`Questlog API starting on port ${port}`)

serve({ fetch: app.fetch, port })
