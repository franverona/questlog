# Questlog — Gamification-as-a-Service

A full-stack Gamification-as-a-Service platform with a REST API and management dashboard.

## Stack

| Layer     | Tech                                |
| --------- | ----------------------------------- |
| API       | Hono + Node.js (port 3001)          |
| Dashboard | Next.js 16 App Router (port 3000)   |
| Database  | PostgreSQL + Drizzle ORM            |
| Monorepo  | Turborepo                           |
| Language  | TypeScript everywhere               |
| Linting   | ESLint 10 (flat config)             |
| Commits   | Conventional Commits via commitlint |
| Git hooks | Husky + lint-staged                 |
| CI        | GitHub Actions                      |

## Project structure

```
questlog/
├── .github/
│   └── workflows/
│       └── ci.yml         GitHub Actions CI
├── apps/
│   ├── api/               Hono REST API
│   └── dashboard/         Next.js dashboard
├── packages/
│   ├── db/                Drizzle schema + migrations
│   └── types/             Zod schemas + shared TS types
├── docker-compose.yml
├── eslint.config.mjs
├── commitlint.config.mjs
└── .env.example
```

## Setup

### 1. Prerequisites

- Node.js 24.12.0 (use `.nvmrc`: `nvm use`)
- Docker (for Postgres)

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set API_SECRET to a strong random string
```

### 3. Start Postgres

```bash
docker-compose up -d
```

### 4. Install dependencies

```bash
npm install
```

### 5. Run migrations

```bash
npm run db:migrate
```

### 6. Seed the database

```bash
npm run db:seed
```

This creates 5 achievements with varied rule types (event_count, streak, combination) and 3 demo users with event history.

### 7. Start both services

```bash
npm run dev
```

- Dashboard: http://localhost:3000
- API: http://localhost:3001

**Login password**: whatever you set as `API_SECRET` in `.env`

---

## API Reference

All routes require `x-api-key: <API_SECRET>` header (or `Authorization: Bearer <API_SECRET>`).

### Track an event

```bash
curl -X POST http://localhost:3001/v1/events/track \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "external_user_id": "user_alice",
    "event_name": "user.login",
    "metadata": { "ip": "127.0.0.1" }
  }'
```

Response:

```json
{
  "data": {
    "tracked": true,
    "achievements_unlocked": [
      { "id": "...", "name": "First Steps", "points": 10, ... }
    ]
  },
  "error": null,
  "meta": null
}
```

### Get user achievements

```bash
curl http://localhost:3001/v1/users/user_alice/achievements \
  -H "x-api-key: your-secret"
```

### Get user progress

```bash
curl http://localhost:3001/v1/users/user_alice/progress \
  -H "x-api-key: your-secret"
```

### Get leaderboard (top 20 by points)

```bash
curl http://localhost:3001/v1/leaderboard \
  -H "x-api-key: your-secret"
```

### CRUD — Achievements

```bash
# List
curl http://localhost:3001/v1/achievements -H "x-api-key: your-secret"

# Create
curl -X POST http://localhost:3001/v1/achievements \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"name": "Super User", "points": 500}'

# Update
curl -X PUT http://localhost:3001/v1/achievements/<id> \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"name": "Super User", "points": 600}'

# Delete
curl -X DELETE http://localhost:3001/v1/achievements/<id> \
  -H "x-api-key: your-secret"
```

### CRUD — Rules

```bash
# List (grouped by achievement)
curl http://localhost:3001/v1/rules -H "x-api-key: your-secret"

# Create (event_count)
curl -X POST http://localhost:3001/v1/rules \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "achievementId": "<achievement-uuid>",
    "condition": { "type": "event_count", "event_name": "purchase.completed", "threshold": 5 }
  }'

# Create (streak)
curl -X POST http://localhost:3001/v1/rules \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "achievementId": "<achievement-uuid>",
    "condition": { "type": "streak", "event_name": "user.login", "days": 30 }
  }'

# Create (combination)
curl -X POST http://localhost:3001/v1/rules \
  -H "x-api-key: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "achievementId": "<achievement-uuid>",
    "condition": {
      "type": "combination",
      "operator": "AND",
      "conditions": [
        { "type": "event_count", "event_name": "user.login", "threshold": 10 },
        { "type": "streak", "event_name": "user.login", "days": 3 }
      ]
    }
  }'
```

---

## Rule engine

Rules live in `apps/api/src/rule-engine.ts`. The evaluator runs synchronously after every tracked event.

### Supported condition types

| Type          | Description                                                 |
| ------------- | ----------------------------------------------------------- |
| `event_count` | User fired event ≥ N times                                  |
| `streak`      | User fired event on N consecutive calendar days up to today |
| `combination` | `AND`/`OR` over nested conditions (recursive, any depth)    |

Adding a new condition type only requires adding a new `case` in `evalCondition` — the TypeScript exhaustive check will flag any unhandled type at compile time.

### Running tests

```bash
npm run test --filter=@questlog/api
# or from apps/api:
cd apps/api && npm test
```

20 unit tests covering all condition types, AND/OR combinations, edge cases (zero events, duplicate days in streaks, broken streaks, already-unlocked achievements).

---

## npm scripts

| Script               | Description                       |
| -------------------- | --------------------------------- |
| `npm run dev`        | Start API + dashboard in parallel |
| `npm run build`      | Build all packages                |
| `npm run test`       | Run all tests                     |
| `npm run lint`       | Run ESLint across all packages    |
| `npm run db:migrate` | Apply pending migrations          |
| `npm run db:seed`    | Seed demo data                    |

---

## Git workflow

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add leaderboard endpoint
fix: correct streak calculation off-by-one
chore: update dependencies
docs: update API reference
```

The `commit-msg` hook rejects commits that don't match this format.

The `pre-commit` hook runs ESLint via lint-staged on all staged `.ts`/`.tsx` files before every commit.

---

## CI

GitHub Actions runs on every push and pull request to `main` (skipped for changes to non-code files like markdown). The pipeline runs:

1. `npm ci` — install dependencies
2. `npm run lint` — ESLint
3. `npm run build` — Turborepo build (API tsc + Next.js build)
4. `npm test` — Vitest unit tests
