import { serve } from '@hono/node-server'
import { swaggerUI } from '@hono/swagger-ui'
import { createDb } from '@questlog/db'
import { apiKeyAuth } from './middleware/auth.js'
import { rateLimit } from './middleware/rate-limit.js'
import { errorHandler } from './middleware/error-handler.js'
import { requestLogger } from './middleware/logger.js'
import { eventsRouter } from './routes/events.js'
import { usersRouter } from './routes/users.js'
import { leaderboardRouter } from './routes/leaderboard.js'
import { achievementsRouter } from './routes/achievements.js'
import { rulesRouter } from './routes/rules.js'
import { statsRouter } from './routes/stats.js'
import { createRouter } from './types.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required')
}

const db = createDb(databaseUrl)

const app = createRouter()

// Register API key security scheme for Swagger UI
app.openAPIRegistry.registerComponent('securitySchemes', 'ApiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'x-api-key',
})

// Global middleware
app.use('*', requestLogger())
app.use('*', async (c, next) => {
  c.set('db', db)
  await next()
})

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok' }))

// OpenAPI spec and Swagger UI (no auth)
app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'Questlog API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
  tags: [
    { name: 'achievements', description: 'Manage achievement definitions' },
    { name: 'rules', description: 'Condition rules that unlock achievements' },
    { name: 'events', description: 'Track user events and trigger rule evaluation' },
    { name: 'users', description: 'Per-user achievements, progress, and event history' },
    { name: 'leaderboard', description: 'Top users ranked by total achievement points' },
    { name: 'stats', description: 'Aggregate platform statistics' },
  ],
})
app.get('/docs', swaggerUI({ url: '/openapi.json', persistAuthorization: true }))

// Authenticated v1 routes
const v1 = createRouter()
v1.use('*', apiKeyAuth())
v1.use('*', rateLimit(100, 60_000)) // 100 requests per minute, per API key

v1.route('/events', eventsRouter)
v1.route('/users', usersRouter)
v1.route('/leaderboard', leaderboardRouter)
v1.route('/achievements', achievementsRouter)
v1.route('/rules', rulesRouter)
v1.route('/stats', statsRouter)

app.route('/v1', v1)

// Error handler
app.onError(errorHandler)

// 404 handler
app.notFound((c) =>
  c.json({ data: null, error: { message: 'Not found', code: 'NOT_FOUND' }, meta: null }, 404),
)

const port = parseInt(process.env.PORT ?? '3001', 10)

console.log(`Questlog API starting on port ${port}`)

serve({ fetch: app.fetch, port })
