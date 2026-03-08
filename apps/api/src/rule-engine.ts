import type { Db } from '@questlog/db'
import { rules, userAchievements, userEvents, achievements } from '@questlog/db'
import { eq, inArray } from 'drizzle-orm'
import type { Condition } from '@questlog/types'

export type Achievement = {
  id: string
  name: string
  description: string | null | undefined
  iconUrl: string | null | undefined
  points: number
  createdAt: Date | string
}

type EventRow = {
  eventName: string
  createdAt: Date
}

// ─── Condition evaluators ─────────────────────────────────────────────────────

function evalEventCount(
  condition: { type: 'event_count'; event_name: string; threshold: number },
  events: EventRow[],
): boolean {
  const count = events.filter((e) => e.eventName === condition.event_name).length
  return count >= condition.threshold
}

function evalStreak(
  condition: { type: 'streak'; event_name: string; days: number },
  events: EventRow[],
): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Collect distinct calendar days for this event
  const days = new Set(
    events
      .filter((e) => e.eventName === condition.event_name)
      .map((e) => {
        const d = new Date(e.createdAt)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }),
  )

  if (days.size === 0) return false

  // Walk backwards from today checking for consecutive days
  let streak = 0
  const cursor = new Date(today)
  while (days.has(cursor.getTime())) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak >= condition.days
}

function evalCondition(condition: Condition, events: EventRow[]): boolean {
  switch (condition.type) {
    case 'event_count':
      return evalEventCount(condition, events)

    case 'streak':
      return evalStreak(condition, events)

    case 'combination': {
      const { operator, conditions } = condition
      if (operator === 'AND') {
        return conditions.every((c) => evalCondition(c, events))
      }
      // OR
      return conditions.some((c) => evalCondition(c, events))
    }

    default: {
      // Exhaustive check — adding a new type only requires a new case
      const _exhaustive: never = condition
      throw new Error(`Unknown condition type: ${(_exhaustive as Condition).type}`)
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function evaluateRules(userId: string, db: Db): Promise<Achievement[]> {
  // 1. Load user's full event history
  const eventRows = await db
    .select({ eventName: userEvents.eventName, createdAt: userEvents.createdAt })
    .from(userEvents)
    .where(eq(userEvents.externalUserId, userId))

  // 2. Load achievements already unlocked by this user
  const unlockedRows = await db
    .select({ achievementId: userAchievements.achievementId })
    .from(userAchievements)
    .where(eq(userAchievements.externalUserId, userId))

  const unlockedIds = new Set(unlockedRows.map((r) => r.achievementId))

  // 3. Load all rules with their achievement
  const allRules = await db
    .select({
      ruleId: rules.id,
      achievementId: rules.achievementId,
      condition: rules.condition,
      achievementName: achievements.name,
      achievementDescription: achievements.description,
      achievementIconUrl: achievements.iconUrl,
      achievementPoints: achievements.points,
      achievementCreatedAt: achievements.createdAt,
    })
    .from(rules)
    .innerJoin(achievements, eq(rules.achievementId, achievements.id))

  // 4. Evaluate rules, skipping already-unlocked achievements
  const toUnlock: string[] = []

  for (const rule of allRules) {
    if (unlockedIds.has(rule.achievementId)) continue

    const condition = rule.condition as Condition
    if (evalCondition(condition, eventRows)) {
      toUnlock.push(rule.achievementId)
    }
  }

  if (toUnlock.length === 0) return []

  // Deduplicate (multiple rules may target same achievement)
  const uniqueToUnlock = [...new Set(toUnlock)]

  // 5. Insert newly unlocked achievements
  await db
    .insert(userAchievements)
    .values(uniqueToUnlock.map((achievementId) => ({ externalUserId: userId, achievementId })))
    .onConflictDoNothing()

  // 6. Return the unlocked achievement details
  const newlyUnlocked = await db
    .select()
    .from(achievements)
    .where(inArray(achievements.id, uniqueToUnlock))

  return newlyUnlocked
}

// ─── Exported for unit tests ──────────────────────────────────────────────────
export { evalCondition }
export type { EventRow }
