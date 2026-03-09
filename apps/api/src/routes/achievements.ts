import { achievements } from '@questlog/db'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { CreateAchievementSchema } from '@questlog/types'
import { createRouter } from '../types.js'

export const achievementsRouter = createRouter()

achievementsRouter.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db.select().from(achievements)
  return c.json({ data: rows, error: null, meta: { total: rows.length } })
})

achievementsRouter.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [row] = await db.select().from(achievements).where(eq(achievements.id, id))

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Achievement not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null })
})

achievementsRouter.post('/', zValidator('json', CreateAchievementSchema), async (c) => {
  const db = c.get('db')
  const body = c.req.valid('json')

  const [row] = await db
    .insert(achievements)
    .values({
      name: body.name,
      description: body.description,
      iconUrl: body.iconUrl || null,
      points: body.points,
    })
    .returning()

  return c.json({ data: row, error: null, meta: null }, 201)
})

achievementsRouter.put('/:id', zValidator('json', CreateAchievementSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const [row] = await db
    .update(achievements)
    .set({
      name: body.name,
      description: body.description,
      iconUrl: body.iconUrl || null,
      points: body.points,
    })
    .where(eq(achievements.id, id))
    .returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Achievement not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null })
})

achievementsRouter.delete('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')

  const [row] = await db.delete(achievements).where(eq(achievements.id, id)).returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Achievement not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null })
})
