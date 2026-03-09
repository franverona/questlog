import type { Db } from '@questlog/db'
import { OpenAPIHono } from '@hono/zod-openapi'

export type Env = { Variables: { db: Db } }

export const createRouter = () =>
  new OpenAPIHono<Env>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            data: null,
            error: {
              message: result.error.issues[0]?.message ?? 'Validation error',
              code: 'VALIDATION_ERROR',
            },
            meta: null,
          },
          400,
        )
      }
    },
  })
