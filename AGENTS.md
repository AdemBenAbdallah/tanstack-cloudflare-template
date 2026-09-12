# AGENTS.md — AI agent instructions for this repo

Source of truth for how to work in this template. Read this file before
writing any code. `CLAUDE.md` extends it with assistant-specific notes.

## What this is

TanStack Start (SSR + server functions) on Cloudflare Workers, D1 + Drizzle,
Better Auth with global roles (`user`/`manager`/`admin`), Tailwind v4 +
shadcn/ui. Dashboard template, English + Arabic (RTL), dark + light mode.
Stays on the Cloudflare **free plan** — do not add paid services.

## Commands

```bash
pnpm dev                  # local dev (Workers runtime, local D1) :3000
pnpm build                # production client + SSR build
pnpm typecheck            # tsc --noEmit (must pass)
pnpm lint                 # biome check . (must pass)
pnpm test                 # vitest in workerd, ephemeral D1 + real migrations
pnpm cf-typegen           # regenerate worker-configuration.d.ts after wrangler.jsonc edits
pnpm db:generate          # new Drizzle migration from src/db/schema.ts
pnpm db:migrate:local     # apply migrations to local D1
```

Local secrets: `.dev.vars` (gitignored). Never commit secrets.

## UI rules (strict)

1. **shadcn only.** Every interactive/visual element MUST come from
   `src/components/ui/*` (Button, Card, Input, Label, Dialog, DropdownMenu,
   Select, Table, Tabs, Badge, Avatar, Sheet, Sidebar, Chart, ToggleGroup,
   Sonner Toaster, etc.). The dashboard mirrors the shadcn dashboard
   example block — keep that look, don't restyle it custom.
   Never hand-roll a button, input, modal, select, or tooltip, and never
   inline a one-off component that duplicates a shadcn one.
2. **New primitives**: if a needed shadcn component is missing, add the
   canonical shadcn/ui `new-york` v4 version under `src/components/ui/`
   (Radix dependency if required) — do not invent a custom variant.
3. **Semantic tokens only.** Colors via theme tokens
   (`bg-background`, `text-foreground`, `text-muted-foreground`,
   `bg-muted`, `border-border`, `bg-primary`, `text-destructive`, …).
   Never hardcode hex/RGB or `white`/`black`/`gray-*` for surfaces or text.
   Every screen must be verified in **both light and dark** mode.
4. **Merge classes with `cn()`** from `@/lib/utils` (never string concat).
5. **Feedback via Sonner**: mutations toast success/error (`toast.success`,
   `toast.error`). A `<Toaster richColors closeButton />` is already mounted
   in `__root.tsx` — never mount a second one.

## i18n rules (strict)

1. **No hardcoded user-facing strings in JSX.** Every label, title,
   placeholder, toast, and description goes through the dictionaries in
   `src/i18n/en.ts` + `src/i18n/ar.ts` via `useLocale().t`.
2. **Both locales, always.** `ar` is typed as `Dict` (= `typeof en`), so a
   missing Arabic key is a type error — keep them in sync in the same change.
3. **RTL-safe layouts.** The app runs `ltr` (en) and `rtl` (ar). Use logical
   properties (`ms-*`/`me-*`, `start`/`end`, `text-start`) — never physical
   `ml-*`/`mr-*`/`left-*`/`right-*`/`text-left`/`text-right` for layout.
   Test every screen in Arabic (`LocaleToggle` in the header).

## Server rules (strict)

1. **Server-only modules end in `.server.ts`**
   (`src/auth/auth.server.ts`, `src/lib/env.server.ts`). TanStack Start's
   import protection keeps them out of the client bundle, where
   `cloudflare:workers` cannot resolve. Importing one from client code is a
   build error — that is the guardrail working.
2. **Server functions** (`createServerFn` in `src/lib/auth-guard.ts`,
   `src/lib/school.ts`, `src/lib/lessons.ts`): top-level imports must be
   client-safe (zod schemas, types, drizzle schema). Lazy-import server
   modules **inside handlers**: `await import("@/auth/auth.server")`.
3. **Bindings**: single entry `src/lib/env.server.ts`
   (`env.DB`, `env.KV`, `env.UPLOADS`). Per-request `createAuth()` /
   `createDb()` — never cache across requests, never module-scope.
4. **Auth API route**: `src/routes/api/auth/$.ts` forwards to Better Auth.
   Keep its imports lazy (see file).
5. **School context**: every tenant server function starts from
   `requireMembershipFn()` (or `requireSchoolRoleFn([...])`). The
   `school_id` NEVER comes from client input — it comes from the
   session's membership. Verify profile/vehicle/enrollment rows belong to
   that school before touching them (composite FKs backstop this in SQL).

## Data / RBAC rules

1. **Schema is the source of truth**: edit `src/db/schema.ts` →
   `pnpm db:generate` → REVIEW the SQL → migrate. Auth tables included;
   never hand-write SQL migrations (except the overlap triggers, which
   Drizzle cannot express — see `drizzle/0000_*.sql` tail).
2. **FK policy (D1 quirk)**: domain FKs are RESTRICT/NO ACTION, never
   CASCADE — D1 ignores `PRAGMA foreign_keys=OFF` inside migrations, so a
   table rebuild with CASCADE children wipes data. Deletes are programmatic.
3. **Roles** (`src/auth/permissions.ts`): `student` < `instructor` <
   `secretary` < `owner` (per-school, via `school_member`). `user.role` is
   the Better Auth PLATFORM role only — never use it for school access.
   Enforce server-side in this order: route `beforeLoad` redirect →
   `requireSchoolRoleFn`/`requireMembershipFn` in every server function →
   `roleCan` for coarse checks + row scoping (own vs all) per role.
   UI hiding is cosmetic only.
4. **Never trust the client role.** Re-check on the server for every mutation.
5. **Schedule** (`src/features/schedule/`, server fns in `src/lib/lessons.ts`):
   `/calendar` and all lesson mutations are staff-only (`owner`/`secretary`)
   except instructors completing/annotating their OWN lessons (field-level
   check in `updateLessonFn`). Overlap rule: app-level `findOverlap` for UX
   + DB trigger as final layer (cancelled never blocks; cancelled/no-show
   inserts never conflict). Date display uses the explicit date-fns locale
   (`useDateFnsLocale`) — never `setDefaultOptions` (leaks across SSR
   requests). Physical direction classes (`left-*`, `ml-*`, …) are banned
   here; the week grid positions events via `insetInlineStart`.
6. **Hours are derived, never stored**: progress = SUM over `completed`
   lessons (driving bucket = `driving`+`parking`, theory = `theory`, exams
   consume attempts). Money in integer millimes; payments are voided, never
   edited.

## Cost rule

Free plan only (no card on file = overages fail, never bill). Do NOT add
paid services (email/SMS/push vendors, hosted DBs, image CDNs) without
asking. If email is requested: Resend free tier (~3K/mo) is the default
answer, not Cloudflare Email Sending (needs Workers Paid).

## Verification

After code changes, run (in order): `pnpm typecheck`, `pnpm lint`,
`pnpm test`, `pnpm build`. Check the screen in light + dark and en + ar
before calling anything done. Fix the root cause — never weaken a rule to
make a check pass.
