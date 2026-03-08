import { z } from 'zod'

// ─── Condition schemas (recursive) ───────────────────────────────────────────

export const EventCountConditionSchema = z.object({
  type: z.literal('event_count'),
  event_name: z.string().min(1),
  threshold: z.number().int().positive(),
})

export const StreakConditionSchema = z.object({
  type: z.literal('streak'),
  event_name: z.string().min(1),
  days: z.number().int().positive(),
})

// Forward-declare for recursion
export type Condition =
  | z.infer<typeof EventCountConditionSchema>
  | z.infer<typeof StreakConditionSchema>
  | CombinationCondition

export type CombinationCondition = {
  type: 'combination'
  operator: 'AND' | 'OR'
  conditions: Condition[]
}

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion('type', [
    EventCountConditionSchema,
    StreakConditionSchema,
    z.object({
      type: z.literal('combination'),
      operator: z.enum(['AND', 'OR']),
      conditions: z.array(ConditionSchema).min(1),
    }),
  ]),
)

export const CombinationConditionSchema: z.ZodType<CombinationCondition> = z.object({
  type: z.literal('combination'),
  operator: z.enum(['AND', 'OR']),
  conditions: z.array(ConditionSchema).min(1),
})

// ─── Achievement ──────────────────────────────────────────────────────────────

export const AchievementSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  points: z.number().int().nonnegative(),
  createdAt: z.date().or(z.string()),
})

export type Achievement = z.infer<typeof AchievementSchema>

export const CreateAchievementSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  iconUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  points: z.number().int().nonnegative(),
})

export type CreateAchievement = z.infer<typeof CreateAchievementSchema>

// ─── Rule ─────────────────────────────────────────────────────────────────────

export const RuleSchema = z.object({
  id: z.string().uuid(),
  achievementId: z.string().uuid(),
  condition: ConditionSchema,
  createdAt: z.date().or(z.string()),
})

export type Rule = z.infer<typeof RuleSchema>

export const CreateRuleSchema = z.object({
  achievementId: z.string().uuid('Achievement ID must be a valid UUID'),
  condition: ConditionSchema,
})

export type CreateRule = z.infer<typeof CreateRuleSchema>

// ─── Event tracking ───────────────────────────────────────────────────────────

export const TrackEventSchema = z.object({
  external_user_id: z.string().min(1, 'external_user_id is required'),
  event_name: z.string().min(1, 'event_name is required'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type TrackEvent = z.infer<typeof TrackEventSchema>

// ─── API response envelope ────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string(),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

export type ApiResponse<T> =
  | { data: T; error: null; meta: null }
  | { data: T; error: null; meta: Record<string, unknown> }
  | { data: null; error: ApiError; meta: null }

// ─── Progress ─────────────────────────────────────────────────────────────────

export const ProgressItemSchema = z.object({
  achievement_id: z.string().uuid(),
  achievement_name: z.string(),
  current_count: z.number().int().nonnegative(),
  threshold: z.number().int().positive(),
  percent: z.number().min(0).max(100),
})

export type ProgressItem = z.infer<typeof ProgressItemSchema>

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  external_user_id: z.string(),
  total_points: z.number().int().nonnegative(),
})

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>
