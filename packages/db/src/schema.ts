import { pgTable, text, timestamp, integer, jsonb, uuid, index, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  points: integer('points').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const rules = pgTable('rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  achievementId: uuid('achievement_id')
    .notNull()
    .references(() => achievements.id, { onDelete: 'cascade' }),
  condition: jsonb('condition').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const userEvents = pgTable(
  'user_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalUserId: text('external_user_id').notNull(),
    eventName: text('event_name').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('user_events_user_idx').on(t.externalUserId),
    index('user_events_event_idx').on(t.eventName),
    index('user_events_user_event_idx').on(t.externalUserId, t.eventName),
  ],
)

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalUserId: text('external_user_id').notNull(),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
  },
  (t) => [
    index('user_achievements_user_idx').on(t.externalUserId),
    unique('user_achievements_unique').on(t.externalUserId, t.achievementId),
  ],
)

// Relations

export const achievementsRelations = relations(achievements, ({ many }) => ({
  rules: many(rules),
  userAchievements: many(userAchievements),
}))

export const rulesRelations = relations(rules, ({ one }) => ({
  achievement: one(achievements, {
    fields: [rules.achievementId],
    references: [achievements.id],
  }),
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}))
