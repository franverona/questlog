import { createDb } from './client.js'
import {
  achievements,
  rules,
  userEvents,
  userAchievements,
} from './schema.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const db = createDb(connectionString)

// Clear existing data
await db.delete(userAchievements)
await db.delete(userEvents)
await db.delete(rules)
await db.delete(achievements)

console.log('Seeding achievements...')

// Create achievements
const [firstLogin, tenLogins, streakWeek, powerUser, explorer] = await db
  .insert(achievements)
  .values([
    {
      name: 'First Steps',
      description: 'Log in for the first time',
      iconUrl: 'https://api.iconify.design/twemoji/footprints.svg',
      points: 10,
    },
    {
      name: 'Loyal User',
      description: 'Log in 10 times',
      iconUrl: 'https://api.iconify.design/twemoji/star.svg',
      points: 50,
    },
    {
      name: '7-Day Streak',
      description: 'Log in for 7 consecutive days',
      iconUrl: 'https://api.iconify.design/twemoji/fire.svg',
      points: 100,
    },
    {
      name: 'Power User',
      description: 'Log in 5 times AND complete a purchase',
      iconUrl: 'https://api.iconify.design/twemoji/rocket.svg',
      points: 200,
    },
    {
      name: 'Explorer',
      description: 'View a product page 3 times OR complete a search 5 times',
      iconUrl: 'https://api.iconify.design/twemoji/compass.svg',
      points: 75,
    },
  ])
  .returning()

console.log('Seeding rules...')

await db.insert(rules).values([
  {
    achievementId: firstLogin!.id,
    condition: { type: 'event_count', event_name: 'user.login', threshold: 1 },
  },
  {
    achievementId: tenLogins!.id,
    condition: {
      type: 'event_count',
      event_name: 'user.login',
      threshold: 10,
    },
  },
  {
    achievementId: streakWeek!.id,
    condition: { type: 'streak', event_name: 'user.login', days: 7 },
  },
  {
    achievementId: powerUser!.id,
    condition: {
      type: 'combination',
      operator: 'AND',
      conditions: [
        { type: 'event_count', event_name: 'user.login', threshold: 5 },
        { type: 'event_count', event_name: 'purchase.completed', threshold: 1 },
      ],
    },
  },
  {
    achievementId: explorer!.id,
    condition: {
      type: 'combination',
      operator: 'OR',
      conditions: [
        {
          type: 'event_count',
          event_name: 'product.viewed',
          threshold: 3,
        },
        { type: 'event_count', event_name: 'search.performed', threshold: 5 },
      ],
    },
  },
])

console.log('Seeding user events...')

// Generate dates for streak testing — last 7 days for user_alice
const now = new Date()
const daysAgo = (n: number) => {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  d.setHours(10, 0, 0, 0)
  return d
}

// user_alice: 10 logins over past 7 days (streak + loyal user), 1 purchase (power user)
const aliceEvents = []
for (let i = 6; i >= 0; i--) {
  aliceEvents.push({
    externalUserId: 'user_alice',
    eventName: 'user.login',
    metadata: {},
    createdAt: daysAgo(i),
  })
}
// Extra logins to reach 10
aliceEvents.push(
  {
    externalUserId: 'user_alice',
    eventName: 'user.login',
    metadata: {},
    createdAt: daysAgo(7),
  },
  {
    externalUserId: 'user_alice',
    eventName: 'user.login',
    metadata: {},
    createdAt: daysAgo(8),
  },
  {
    externalUserId: 'user_alice',
    eventName: 'user.login',
    metadata: {},
    createdAt: daysAgo(9),
  }
)
aliceEvents.push({
  externalUserId: 'user_alice',
  eventName: 'purchase.completed',
  metadata: { amount: 99.99, product_id: 'prod_123' },
  createdAt: daysAgo(1),
})

// user_bob: 5 logins (loyal user in progress), 3 product views (explorer)
const bobEvents = []
for (let i = 0; i < 5; i++) {
  bobEvents.push({
    externalUserId: 'user_bob',
    eventName: 'user.login',
    metadata: {},
    createdAt: daysAgo(i * 2 + 3),
  })
}
for (let i = 0; i < 3; i++) {
  bobEvents.push({
    externalUserId: 'user_bob',
    eventName: 'product.viewed',
    metadata: { product_id: `prod_${i + 1}` },
    createdAt: daysAgo(i),
  })
}

// user_charlie: 1 login (first steps), 5 searches (explorer via OR)
const charlieEvents = [
  {
    externalUserId: 'user_charlie',
    eventName: 'user.login',
    metadata: {},
    createdAt: daysAgo(0),
  },
  ...Array.from({ length: 5 }, (_, i) => ({
    externalUserId: 'user_charlie',
    eventName: 'search.performed',
    metadata: { query: `search_term_${i}` },
    createdAt: daysAgo(i),
  })),
]

await db.insert(userEvents).values([
  ...aliceEvents,
  ...bobEvents,
  ...charlieEvents,
])

console.log('Seed complete!')
console.log('  user_alice: 10 logins (7-day streak), 1 purchase')
console.log('  user_bob: 5 logins, 3 product views')
console.log('  user_charlie: 1 login, 5 searches')
console.log(
  '\nRun the rule evaluator manually or track a new event to see achievements unlock.'
)

process.exit(0)
