import { Hono } from "hono";
import { userAchievements, userEvents, achievements, rules } from "@questlog/db";
import type { Db } from "@questlog/db";
import { eq, desc } from "drizzle-orm";
import type { Condition } from "@questlog/types";
import { evalCondition } from "../rule-engine.js";

type Env = { Variables: { db: Db } };

export const usersRouter = new Hono<Env>();

// GET /v1/users/:userId/achievements
usersRouter.get("/:userId/achievements", async (c) => {
  const db = c.get("db");
  const userId = c.req.param("userId");

  const rows = await db
    .select({
      id: achievements.id,
      name: achievements.name,
      description: achievements.description,
      iconUrl: achievements.iconUrl,
      points: achievements.points,
      createdAt: achievements.createdAt,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.externalUserId, userId))
    .orderBy(desc(userAchievements.unlockedAt));

  return c.json({
    data: rows,
    error: null,
    meta: { total: rows.length },
  });
});

// GET /v1/users/:userId/progress
usersRouter.get("/:userId/progress", async (c) => {
  const db = c.get("db");
  const userId = c.req.param("userId");

  // Unlocked achievements
  const unlockedRows = await db
    .select({
      id: achievements.id,
      name: achievements.name,
      description: achievements.description,
      iconUrl: achievements.iconUrl,
      points: achievements.points,
      createdAt: achievements.createdAt,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.externalUserId, userId));

  const unlockedIds = new Set(unlockedRows.map((r) => r.id));

  // User events for progress calculation
  const eventRows = await db
    .select({ eventName: userEvents.eventName, createdAt: userEvents.createdAt })
    .from(userEvents)
    .where(eq(userEvents.externalUserId, userId));

  // All rules for locked achievements
  const allRules = await db
    .select({
      achievementId: rules.achievementId,
      achievementName: achievements.name,
      condition: rules.condition,
    })
    .from(rules)
    .innerJoin(achievements, eq(rules.achievementId, achievements.id));

  // Build progress for locked achievements with event_count conditions
  const progressMap = new Map<
    string,
    { achievement_id: string; achievement_name: string; current_count: number; threshold: number; percent: number }
  >();

  for (const rule of allRules) {
    if (unlockedIds.has(rule.achievementId)) continue;

    const condition = rule.condition as Condition;
    extractProgress(condition, rule.achievementId, rule.achievementName, eventRows, progressMap);
  }

  return c.json({
    data: {
      unlocked: unlockedRows,
      progress: [...progressMap.values()],
    },
    error: null,
    meta: null,
  });
});

// GET /v1/users/:userId/events
usersRouter.get("/:userId/events", async (c) => {
  const db = c.get("db");
  const userId = c.req.param("userId");

  const rows = await db
    .select()
    .from(userEvents)
    .where(eq(userEvents.externalUserId, userId))
    .orderBy(desc(userEvents.createdAt))
    .limit(50);

  return c.json({ data: rows, error: null, meta: { total: rows.length } });
});

function extractProgress(
  condition: Condition,
  achievementId: string,
  achievementName: string,
  events: { eventName: string; createdAt: Date }[],
  map: Map<string, { achievement_id: string; achievement_name: string; current_count: number; threshold: number; percent: number }>
) {
  if (condition.type === "event_count") {
    const current = events.filter((e) => e.eventName === condition.event_name).length;
    const threshold = condition.threshold;
    const percent = Math.min(100, Math.round((current / threshold) * 100));

    const existing = map.get(achievementId);
    // Keep the entry that is "most meaningful" — highest percent
    if (!existing || percent > existing.percent) {
      map.set(achievementId, {
        achievement_id: achievementId,
        achievement_name: achievementName,
        current_count: current,
        threshold,
        percent,
      });
    }
  } else if (condition.type === "combination") {
    for (const c of condition.conditions) {
      extractProgress(c, achievementId, achievementName, events, map);
    }
  }
}
