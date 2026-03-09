/**
 * Shared OpenAPI schema components.
 *
 * Defined with `z` from `@hono/zod-openapi` so every schema gets the
 * `.openapi()` TypeScript method and field-level examples. Schemas that are
 * given a string ref (e.g. `.openapi('Achievement')`) are emitted as named
 * `$ref` entries in `#/components/schemas` instead of being inlined everywhere.
 */
import { z } from '@hono/zod-openapi'

// ─── Shared error ─────────────────────────────────────────────────────────────

export const ErrorSchema = z
  .object({
    data: z.null(),
    error: z.object({
      message: z.string().openapi({ example: 'Resource not found' }),
      code: z.string().openapi({ example: 'NOT_FOUND' }),
    }),
    meta: z.null(),
  })
  .openapi('Error')

// ─── Achievement ──────────────────────────────────────────────────────────────

export const AchievementDbSchema = z
  .object({
    id: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    name: z.string().openapi({ example: 'First Login' }),
    description: z
      .string()
      .nullable()
      .openapi({ example: 'Awarded for logging in for the first time' }),
    iconUrl: z
      .string()
      .nullable()
      .openapi({ example: 'https://example.com/icons/first-login.png' }),
    points: z.number().int().openapi({ example: 10 }),
    createdAt: z.date().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('Achievement')

export const CreateAchievementOpenAPISchema = z
  .object({
    name: z.string().min(1, 'Name is required').openapi({ example: 'First Login' }),
    description: z
      .string()
      .optional()
      .openapi({ example: 'Awarded for logging in for the first time' }),
    iconUrl: z
      .string()
      .url('Must be a valid URL')
      .optional()
      .or(z.literal(''))
      .openapi({ example: 'https://example.com/icons/first-login.png' }),
    points: z.number().int().nonnegative().openapi({ example: 10 }),
  })
  .openapi('CreateAchievement')

// ─── Condition ────────────────────────────────────────────────────────────────

// Non-recursive version of the real ConditionSchema — z.lazy() cannot be
// serialised to a static JSON Schema without a $ref cycle.
export const ConditionOpenAPISchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('event_count'),
      event_name: z.string().min(1).openapi({ example: 'user_login' }),
      threshold: z.number().int().positive().openapi({ example: 10 }),
    }),
    z.object({
      type: z.literal('streak'),
      event_name: z.string().min(1).openapi({ example: 'daily_checkin' }),
      days: z.number().int().positive().openapi({ example: 7 }),
    }),
    z.object({
      type: z.literal('combination'),
      operator: z.enum(['AND', 'OR']).openapi({ example: 'AND' }),
      conditions: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .openapi({ description: 'Nested conditions (event_count, streak, or combination)' }),
    }),
  ])
  .openapi('Condition')

// ─── Rule ─────────────────────────────────────────────────────────────────────

const conditionField = z.unknown().openapi({
  description: 'Rule condition (event_count, streak, or combination)',
  example: { type: 'event_count', event_name: 'user_login', threshold: 1 },
})

// GET responses — include achievementName from the JOIN
export const RuleWithNameDbSchema = z
  .object({
    id: z.string().uuid().openapi({ example: 'b1c2d3e4-f5a6-7890-bcde-f01234567890' }),
    achievementId: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    achievementName: z.string().openapi({ example: 'First Login' }),
    condition: conditionField,
    createdAt: z.date().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('Rule')

// POST/PUT/DELETE responses — raw .returning() rows, no JOIN
export const RuleDbSchema = z
  .object({
    id: z.string().uuid().openapi({ example: 'b1c2d3e4-f5a6-7890-bcde-f01234567890' }),
    achievementId: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    condition: conditionField,
    createdAt: z.date().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('RuleBase')

export const CreateRuleOpenAPISchema = z
  .object({
    achievementId: z
      .string()
      .uuid('Achievement ID must be a valid UUID')
      .openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    condition: ConditionOpenAPISchema,
  })
  .openapi('CreateRule')

// ─── Events ───────────────────────────────────────────────────────────────────

export const TrackEventOpenAPISchema = z
  .object({
    external_user_id: z
      .string()
      .min(1, 'external_user_id is required')
      .openapi({ example: 'user_abc123' }),
    event_name: z.string().min(1, 'event_name is required').openapi({ example: 'level_completed' }),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({ example: { level: 5, score: 1200 } }),
  })
  .openapi('TrackEvent')

export const UnlockedAchievementSchema = z
  .object({
    id: z.string().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    name: z.string().openapi({ example: 'First Login' }),
    description: z
      .string()
      .nullable()
      .optional()
      .openapi({ example: 'Awarded for logging in for the first time' }),
    iconUrl: z.string().nullable().optional().openapi({ example: null }),
    points: z.number().openapi({ example: 10 }),
    createdAt: z.union([z.date(), z.string()]).openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('UnlockedAchievement')

// ─── Users ────────────────────────────────────────────────────────────────────

export const ProgressItemDbSchema = z
  .object({
    achievement_id: z.string().uuid().openapi({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }),
    achievement_name: z.string().openapi({ example: 'Login Streak' }),
    achievement_icon_url: z.string().nullable().openapi({ example: null }),
    current_count: z.number().int().nonnegative().openapi({ example: 3 }),
    threshold: z.number().int().positive().openapi({ example: 7 }),
    percent: z.number().min(0).max(100).openapi({ example: 43 }),
  })
  .openapi('ProgressItem')

export const UserEventDbSchema = z
  .object({
    id: z.string().uuid().openapi({ example: 'c1d2e3f4-a5b6-7890-cdef-012345678901' }),
    externalUserId: z.string().openapi({ example: 'user_abc123' }),
    eventName: z.string().openapi({ example: 'level_completed' }),
    metadata: z.unknown().openapi({ example: { level: 5, score: 1200 } }),
    createdAt: z.date().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('UserEvent')

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const LeaderboardEntryDbSchema = z
  .object({
    rank: z.number().int().positive().openapi({ example: 1 }),
    external_user_id: z.string().openapi({ example: 'user_abc123' }),
    total_points: z.number().int().nonnegative().openapi({ example: 150 }),
  })
  .openapi('LeaderboardEntry')
