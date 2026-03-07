# Questlog — Claude instructions

## Project overview

Gamification-as-a-Service platform. Turborepo monorepo with:
- `apps/api` — Hono REST API (port 3001)
- `apps/dashboard` — Next.js 15 App Router dashboard (port 3000)
- `packages/db` — Drizzle ORM schema + migrations
- `packages/types` — Zod schemas and inferred TypeScript types shared across all packages

## Commands

```bash
npm run dev          # start both apps in parallel
npm run build        # build all packages
npm run test         # run all tests (Vitest)
npm run lint         # ESLint across the entire monorepo
npm run db:migrate   # apply pending Drizzle migrations
npm run db:seed      # seed demo data
```

Run tests for a single package:
```bash
cd apps/api && npm test
```

## Architecture decisions

**Shared types**: All Zod schemas live in `packages/types/src/schemas.ts`. Infer TypeScript types from them — do not write separate type definitions. Both the API (Zod validation) and the dashboard (react-hook-form resolvers) import from this package.

**API response envelope**: Every API response must follow the envelope shape:
```ts
{ data: T, error: null, meta: null | { total?: number } }   // success
{ data: null, error: { message: string, code: string }, meta: null }  // error
```

**Rule engine**: `apps/api/src/rule-engine.ts` has zero framework dependencies so it is fully unit-testable. The `evalCondition` function uses a `switch` with an exhaustive check — adding a new condition type only requires a new `case`. Do not add framework imports to this file.

**Database client**: Always use `createDb()` from `packages/db` — never instantiate `postgres` or `drizzle` directly in app code.

**Auth**: The API uses `timingSafeEqual` for constant-time API key comparison (header: `x-api-key`). The dashboard uses a cookie-based session checked via `requireAuth()` in `apps/dashboard/lib/auth.ts`. Both compare against the same `API_SECRET` env var.

**Next.js env loading**: The dashboard dev/build scripts use `dotenv-cli` to load the root `.env` file (`dotenv -e ../../.env -- next ...`). Next.js does not automatically load `.env` from the monorepo root.

**ESM + webpack**: `packages/types` uses `.js` extensions in imports (required for Node.js ESM). Next.js/webpack resolves these via `extensionAlias` in `apps/dashboard/next.config.ts` — do not remove that config.

## Code conventions

- TypeScript strict mode everywhere.
- `NodeNext` module resolution in Node.js packages (`apps/api`, `packages/*`) — use `.js` extensions in relative imports.
- `bundler` module resolution in `apps/dashboard` — no extensions needed in imports.
- Server components by default in the dashboard; add `"use client"` only when interactivity is required.
- Dashboard API calls go through Next.js route handlers in `apps/dashboard/app/api/` which proxy to the Hono API — client components never call the Hono API directly.

## Commit convention

Conventional Commits are enforced by commitlint on every commit:
```
feat: add X
fix: correct Y
chore: update Z
refactor: simplify W
test: add coverage for V
docs: update README
```

## ESLint

Flat config at `eslint.config.mjs`. Runs on all `.ts`/`.tsx` files. Next.js + react-hooks rules are scoped to `apps/dashboard` only. `--max-warnings=0` is enforced on pre-commit — no warnings allowed through.
