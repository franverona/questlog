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

export function chainable<T>(result: T) {
  const proxy: unknown = new Proxy({} as object, {
    get(_, prop) {
      if (prop === 'then') {
        return (resolve: (v: T) => void, reject: (e: unknown) => void) =>
          Promise.resolve(result).then(resolve, reject)
      }
      return () => proxy
    },
  })
  return proxy
}
