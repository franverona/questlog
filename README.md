# Questlog — Gamification-as-a-Service

A full-stack Gamification-as-a-Service platform with a REST API and management dashboard.

[![CI](https://github.com/franverona/questlog/actions/workflows/ci.yml/badge.svg)](https://github.com/franverona/questlog/actions/workflows/ci.yml)

## Stack

| Layer      | Tech                                            |
| ---------- | ----------------------------------------------- |
| API        | Hono + Node.js (port 3001)                      |
| API docs   | OpenAPI 3.1 via `@hono/zod-openapi`, Swagger UI |
| Dashboard  | Next.js 16 App Router (port 3000)               |
| Database   | PostgreSQL + Drizzle ORM                        |
| Monorepo   | Turborepo                                       |
| Language   | TypeScript everywhere                           |
| Linting    | ESLint 10 (flat config)                         |
| Formatting | Prettier (defaults, via lint-staged)            |
| Commits    | Conventional Commits via commitlint             |
| Git hooks  | Husky + lint-staged                             |
| CI         | GitHub Actions                                  |

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

If you modify `packages/db/src/schema.ts`, generate a new SQL migration file first:

```bash
npm run db:generate  # diff schema and write a new SQL file to packages/db/migrations/
npm run db:migrate   # apply all pending migrations to the database
```

On a fresh setup, just run migrate (the initial migration file already exists):

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
- API docs (Swagger UI): http://localhost:3001/docs

**Login password**: whatever you set as `API_SECRET` in `.env`

---

## API Reference

The interactive Swagger UI at **http://localhost:3001/docs** is the canonical reference — it documents every endpoint, request body, response schema, and lets you call the API directly from the browser. The machine-readable OpenAPI 3.1 spec is at **http://localhost:3001/openapi.json**.

The curl examples below are a quick-start complement to the docs.

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
# All packages
npm run test

# API only (rule engine unit tests)
cd apps/api && npm test

# Dashboard only (proxy route unit tests)
cd apps/dashboard && npm test
```

**API** — 30 unit tests: 20 for the rule engine (all condition types, AND/OR combinations, edge cases including zero events, duplicate days in streaks, broken streaks, and already-unlocked achievements), plus tests for route handlers and rate limiting.

**Dashboard** — 14 unit tests for the catch-all proxy route: auth enforcement, URL/query-string construction, method-specific body forwarding, status passthrough, and non-JSON upstream error handling.

---

## npm scripts

| Script                | Description                                |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Start API + dashboard in parallel          |
| `npm run build`       | Build all packages                         |
| `npm run test`        | Run all tests                              |
| `npm run lint`        | Run ESLint across all packages             |
| `npm run db:generate` | Generate SQL migration from schema changes |
| `npm run db:migrate`  | Apply pending migrations                   |
| `npm run db:seed`     | Seed demo data                             |

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

The `pre-commit` hook runs lint-staged on all staged files:

1. **Prettier** formats `*.{ts,tsx,json,md}` files automatically.
2. **ESLint** (`--max-warnings=0`) checks `*.{ts,tsx}` files — warnings are treated as errors.

To format manually without committing:

```bash
npx prettier --write .
npm run lint
```

---

## CI

GitHub Actions runs on every push and pull request to `main` (skipped for changes to non-code files like markdown). The pipeline runs:

1. `npm ci` — install dependencies
2. `npm run lint` — ESLint
3. `npm run build` — Turborepo build (API tsc + Next.js build)
4. `npm test` — Vitest unit tests
