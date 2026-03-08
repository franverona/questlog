import { Hono } from 'hono'
import type { Db } from '@questlog/db'
import { rules, achievements } from '@questlog/db'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { CreateRuleSchema } from '@questlog/types'

type Env = { Variables: { db: Db } }

export const rulesRouter = new Hono<Env>()

rulesRouter.get('/', async (c) => {
  const db = c.get('db')
  const rows = await db
    .select({
      id: rules.id,
      achievementId: rules.achievementId,
      condition: rules.condition,
      createdAt: rules.createdAt,
      achievementName: achievements.name,
    })
    .from(rules)
    .innerJoin(achievements, eq(rules.achievementId, achievements.id))

  return c.json({ data: rows, error: null, meta: { total: rows.length } })
})

rulesRouter.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')

  const [row] = await db
    .select({
      id: rules.id,
      achievementId: rules.achievementId,
      condition: rules.condition,
      createdAt: rules.createdAt,
      achievementName: achievements.name,
    })
    .from(rules)
    .innerJoin(achievements, eq(rules.achievementId, achievements.id))
    .where(eq(rules.id, id))

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Rule not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null })
})

rulesRouter.post('/', zValidator('json', CreateRuleSchema), async (c) => {
  const db = c.get('db')
  const body = c.req.valid('json')

  const [row] = await db
    .insert(rules)
    .values({
      achievementId: body.achievementId,
      condition: body.condition,
    })
    .returning()

  return c.json({ data: row, error: null, meta: null }, 201)
})

rulesRouter.put('/:id', zValidator('json', CreateRuleSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const [row] = await db
    .update(rules)
    .set({
      achievementId: body.achievementId,
      condition: body.condition,
    })
    .where(eq(rules.id, id))
    .returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Rule not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null })
})

rulesRouter.delete('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')

  const [row] = await db.delete(rules).where(eq(rules.id, id)).returning()

  if (!row) {
    return c.json(
      { data: null, error: { message: 'Rule not found', code: 'NOT_FOUND' }, meta: null },
      404,
    )
  }

  return c.json({ data: row, error: null, meta: null })
})
