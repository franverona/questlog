import { Hono } from 'hono'
import type { Db } from '@questlog/db'

export function createTestApp(db: unknown) {
  const app = new Hono<{ Variables: { db: Db } }>()
  app.use('*', async (c, next) => {
    c.set('db', db as Db)
    await next()
  })
  return app
}
