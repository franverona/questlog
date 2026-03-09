import type { Db } from '@questlog/db'
import { Hono } from 'hono'

export type Env = { Variables: { db: Db } }

export const createRouter = () => new Hono<Env>()
