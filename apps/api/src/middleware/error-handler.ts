import type { ErrorHandler } from 'hono'
import { ZodError } from 'zod'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[Error] ${err.message}`, err.stack)

  if (err instanceof ZodError) {
    return c.json(
      {
        data: null,
        error: {
          message: err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
          code: 'VALIDATION_ERROR',
        },
        meta: null,
      },
      400
    )
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        data: null,
        error: { message: err.message, code: 'HTTP_ERROR' },
        meta: null,
      },
      err.status
    )
  }

  return c.json(
    {
      data: null,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
      meta: null,
    },
    500
  )
}
