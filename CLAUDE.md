# CLAUDE.md — Claude-specific notes for this repo

`AGENTS.md` is the source of truth (stack, commands, UI/i18n/server/RBAC
rules). Follow it first. Notes below are additive.

## How to work here

- Keep responses short and factual. No filler, no emojis in code or chat
  unless asked.
- Reference code as `path:line` so it is clickable.
- Prefer editing existing files over creating new ones. Never create docs
  (`*.md`) unless asked.
- Verify by execution: after implementing, run `typecheck` → `lint` →
  `test` → `build`, and exercise the changed route with `pnpm dev` +
  `curl` (or the browser) in both themes and both locales when UI changed.

## Project-specific gotchas

- `cloudflare:workers` only resolves in `*.server.ts` / server handlers.
  If `pnpm build` fails with `failed to resolve import "cloudflare:workers"`,
  some client-reachable module imports it statically — move the import
  inside the handler body (`await import(...)`).
- `createServerFn().validator(...)` (not `.inputValidator()`, deprecated).
- Document shell pieces (`HeadContent`, `Scripts`,
  `createRootRouteWithContext`) import from `@tanstack/react-router`,
  while `createServerFn` / `getRequestHeader` come from
  `@tanstack/react-start` / `@tanstack/react-start/server`.
- `pnpm test` runs in workerd: D1 is ephemeral, migrations auto-apply from
  `drizzle/` via `test/apply-migrations.ts`. Template pins `vitest@4`
  because `@cloudflare/vitest-plugin` peers require `^4.1.0` — do not
  upgrade to vitest 5.
- Arabic (`ar`) dictionary is type-checked against English (`Dict`) —
  a missing key fails `typecheck`. Add both in one edit.
- `src/routeTree.gen.ts` and `worker-configuration.d.ts` are generated
  (gitignored). Never edit by hand; regenerate via build / `cf-typegen`.

## When to stop and ask

- Adding any dependency with a cost, account, or API key.
- Changing roles/permissions semantics or the auth flow.
- Anything that would break the free-plan constraint in `AGENTS.md`.
