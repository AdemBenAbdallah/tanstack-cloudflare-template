# TanStack Start + Cloudflare Dashboard Template

Full-stack TypeScript starter for role-based dashboards: **TanStack Start**
(SSR + server functions) on **Cloudflare Workers**, **D1 + Drizzle** for SQL,
**Better Auth** with global roles, **Tailwind v4 + shadcn/ui**.
English + Arabic (RTL), dark + light mode. Runs fully on the Cloudflare
free plan.

> Working in this repo with an AI agent? Read `AGENTS.md` first
> (UI/i18n/server/RBAC rules). Claude-specific notes: `CLAUDE.md`.

## Stack (latest, Sep 2026)

| Layer      | Choice |
| ---------- | ------ |
| Framework  | `@tanstack/react-start` 1.168 + Router 1.170, React 19, Vite 8 |
| Deploy     | Cloudflare Workers via `@cloudflare/vite-plugin`, Wrangler 4 |
| UI         | Tailwind CSS v4, shadcn/ui `new-york`, Lucide |
| Data       | TanStack Query, Zod v4 |
| DB         | Cloudflare D1 (SQLite) + Drizzle ORM |
| Auth/RBAC  | Better Auth (email+password, Google) + per-school roles
|            | (`owner`/`secretary`/`instructor`/`student` via memberships) |
| UI kit     | shadcn/ui only (`src/components/ui`) — no custom primitives |
| Dashboard  | Modeled on the shadcn dashboard example: sidebar, section
|            | cards, interactive area chart (recharts), projects table |
| Schedule   | Driving-school lessons calendar (vendored full-calendar,
|            | MIT): agenda/day/week/month/year, drag&drop, EN/AR + dark mode |
| Dates      | date-fns (explicit locale per call — never global defaults) |
| Locales    | English (LTR) + Arabic (RTL) via `src/i18n` dictionaries |
| Theme      | Light / dark / system (`ThemeProvider`, no flash) |
| Misc       | R2 + KV bindings, Biome, Vitest (`@cloudflare/vitest-plugin`) |

## Quickstart

```bash
pnpm install
pnpm cf-typegen          # generate worker-configuration.d.ts from wrangler.jsonc
pnpm db:migrate:local    # apply drizzle/ migrations to local D1
cp .dev.vars.example .dev.vars   # local secrets (already done if .dev.vars exists)
pnpm dev                 # http://localhost:3000
```

Sign up at `/login` — first visit takes you to onboarding, where you
create your auto-école and become its owner. Staff and students get their
accounts created inside the school (no public signup needed for them).

## Scripts

| Script                | What it does                                  |
| --------------------- | --------------------------------------------- |
| `pnpm dev`            | Vite dev with Workers runtime (local D1/KV/R2 only) |
| `pnpm build/preview`  | Production client + SSR build / preview        |
| `pnpm account`        | Show which Cloudflare account wrangler uses    |
| `pnpm deploy:staging` / `:production` | Build + deploy to that env (see DEPLOY.md) |
| `pnpm deploy`         | **Blocked on purpose** — pick an env above     |
| `pnpm cf-typegen`     | Regenerate `worker-configuration.d.ts`         |
| `pnpm db:generate`    | New Drizzle migration from `src/db/schema.ts`  |
| `pnpm db:migrate:local` | Apply migrations to local D1 (always `--local`) |
| `pnpm db:execute:local` | Run SQL against local D1 (always `--local`)  |
| `pnpm db:migrate:remote` | **Blocked on purpose** — use the explicit command in DEPLOY.md |
| `pnpm typecheck/lint/test` | `tsc`, Biome, Vitest (workerd)             |

## Cloudflare setup (staging/production)

> Deploying to a **client's** account? Follow **`DEPLOY.md`** instead —
> it's the step-by-step runbook (account switching, first deploy,
> secrets, admin promotion). Below is the short version.

```bash
# 1. Create remote databases and paste their IDs into wrangler.jsonc
pnpm exec wrangler d1 create app_db_staging
pnpm exec wrangler d1 create app_db_production

# 2. Secrets (never commit these)
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put BETTER_AUTH_URL   # e.g. https://your-app.workers.dev
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET

# 3. Migrate + deploy
pnpm exec wrangler d1 migrations apply app_db --remote
pnpm run deploy
```

Local dev vars live in `.dev.vars` (gitignored); remote config in `wrangler.jsonc`.

## Costs (Cloudflare free plan)

Hosting + DB run at **$0** — no credit card required, so overages fail
instead of billing you (limits reset daily at midnight UTC):

| Resource | Free limit | This template's usage |
| -------- | ---------- | --------------------- |
| Workers requests | 100,000 / day | Dashboards stay far below this |
| Workers CPU | 10 ms / request | SSR + server fns fit easily |
| D1 reads / writes | 5M rows read + 100K written / day | Auth + CRUD barely scratch this |
| D1 storage | 5 GB total, 10 DBs, 500 MB per DB | Users + app tables = megabytes |
| KV | 100K reads / 1K writes / day, 1 GB | Optional cache, barely used |
| R2 | 10 GB storage, 1M + 10M ops / month, zero egress | Uploads when you build that feature |
| Custom domain + SSL | Included | `yourapp.com` on Workers is free |
| Static assets | Free, unlimited | JS/CSS/images don't count to the 100K |

Deliberately **excluded to stay free**: transactional email. Cloudflare's
own Email Sending API requires Workers Paid ($5/mo). When you need
password-reset / verification emails, add either:

- **Resend** — free tier ~3,000 emails/month, works from Workers with one
  `fetch`/SDK call, no Cloudflare upgrade needed; or
- **Cloudflare Email Sending** — after upgrading to Workers Paid
  (3,000 emails/month included, then $0.35/1,000).

When you outgrow free, Workers Paid ($5/mo) needs zero code changes —
same `wrangler.jsonc`, limits just lift.

## RBAC model

Global roles defined in `src/auth/permissions.ts`:

- `user` — read + create projects
- `manager` — + update projects, list/get users
- `admin` — full user/session/project control

Enforce in three layers:

```ts
// 1. Route guard (redirects)
beforeLoad: async () => {
  try {
    return await requireRoleFn({ data: { roles: ["admin"] } });
  } catch {
    throw redirect({ to: "/app" });
  }
}

// 2. Server function (throws UNAUTHORIZED / FORBIDDEN)
await requireRoleFn({ data: { roles: ["admin", "manager"] } });

// 3. UI — hide affordances with authClient.admin.hasPermission / checkRolePermission
```

Demo: `deleteProjectFn` is admin-only server-side; the Delete button in
`/app` fails for non-admins even if shown. See `src/lib/projects.ts`.

## Schedule (driving-school lessons)

`/schedule` (admin + manager only) shows lessons from the `lesson` table:
student, instructor, vehicle, kind (`theory`/`practice`/`exam`), status
(`scheduled`/`completed`/`cancelled`), time range, notes. The `googleEventId`
column is reserved for a future one-way push to Google Calendar.

- Views: agenda (the admin's "who studies today" screen), day, week,
  month, year. Drag a lesson to move it, drag its edge to resize —
  each gesture costs exactly one server mutation.
- Instructors filter the calendar via the user select; admins see all.
- Server functions in `src/lib/lessons.ts` re-check the staff role on
  every call; the UI never trusts its own copy.
- Calendar state lives in `src/features/schedule/` (vendored
  full-calendar, MIT — data layer rewired to D1, strings via `src/i18n`,
  RTL-safe, dark-mode aware).

## Conventions (read before adding code)

- **Server-only code** lives in `*.server.ts` (`src/auth/auth.server.ts`,
  `src/lib/env.server.ts`). Start's import protection keeps these out of the
  client bundle, where `cloudflare:workers` cannot resolve.
- **Server functions** (`createServerFn` in `auth-guard.ts`, `projects.ts`)
  may only import client-safe modules at top level — lazy-import
  (`await import("@/auth/auth.server")`) server modules **inside handlers**.
- **Bindings**: single entry point `src/lib/env.server.ts`
  (`env.DB`, `env.KV`, `env.UPLOADS`). Per-request instances only —
  never cache `createAuth()` / `createDb()` across requests.
- **DB changes**: edit `src/db/schema.ts` → `pnpm db:generate` → migrate.
  Schema is the source of truth (Better Auth tables included).
- **Auth handler**: `src/routes/api/auth/$.ts` forwards to Better Auth.
- **Tests**: `*.test.ts` run in workerd with ephemeral D1 + real migrations
  (`test/apply-migrations.ts`). RBAC matrix: `src/auth/permissions.test.ts`.

## Structure

```
wrangler.jsonc  drizzle.config.ts  vite.config.ts  components.json
drizzle/                        # SQL migrations (commit these)
src/
  router.tsx  routes/           # __root, index→/app, login, onboarding,
                                # _authenticated/*, api/auth/$
  db/{schema.ts,index.ts}       # Drizzle schema + per-request factory
  auth/{permissions.ts,auth.server.ts,auth-client.ts}
  i18n/{en.ts,ar.ts}            # dictionaries (ar typed as Dict = typeof en)
  lib/{auth-guard.ts,school.ts,lessons.ts,env.server.ts,utils.ts}
  hooks/use-mobile.ts
  components/{theme-provider,theme-toggle,locale-toggle}.tsx
  components/dashboard/         # app-sidebar, nav-*, dashboard-header,
                                # section-cards
  features/schedule/            # lessons calendar (views, dialogs, dnd, contexts)
  components/ui/  styles.css    # shadcn primitives ONLY — see AGENTS.md
test/apply-migrations.ts
AGENTS.md  CLAUDE.md            # agent rules (shadcn-only, i18n, server, RBAC)
```
