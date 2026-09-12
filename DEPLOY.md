# DEPLOY.md — Client deployment runbook (Cloudflare free plan)

Deployments always run on the **client's** Cloudflare account, never yours.
Local dev never touches remote resources (see "Safety rules" below).

## 0. Before you start (2 min)

```bash
pnpm account              # who am I logged in as right now?
```

- Deploying for a **different client** than last time?
  `pnpm exec wrangler logout && pnpm exec wrangler login`
- Then confirm: `pnpm account` must show the **client's** email/account.
- Client needs: a Cloudflare account (free, no card). Nothing else.

## 1. First deploy for a client (~10 min)

Run everything from the repo root, logged in as the client.

```bash
# 1. Create resources (copy the database IDs it prints)
pnpm exec wrangler d1 create app_db_production
pnpm exec wrangler kv namespace create KV
pnpm exec wrangler r2 bucket create app-uploads

# 2. Paste IDs into wrangler.jsonc
#    - env.production.d1_databases[0].database_id  <- D1 id from step 1
#    - kv_namespaces[0].id                         <- KV id from step 1
#      (staging block: only if the client wants a staging env — same steps
#       with app_db_staging)

# 3. Regenerate types
pnpm cf-typegen

# 4. Secrets (production values — never commit these)
openssl rand -base64 32
pnpm exec wrangler secret put BETTER_AUTH_SECRET --env production
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: only if the client wants Google login

# 5. Migrate the REMOTE database (explicit --remote, see safety rules)
pnpm exec wrangler d1 migrations apply app_db_production --remote

# 6. Deploy (builds client + SSR, then uploads)
pnpm run deploy:production
# note the URL: https://tanstack-dashboard-production.<account>.workers.dev

# 7. Point auth at the live URL (secret put redeploys automatically)
pnpm exec wrangler secret put BETTER_AUTH_URL --env production
# value: the https://...workers.dev URL from step 6

# 8. Client signs up at https://<url>/login, then you promote them:
pnpm exec wrangler d1 execute app_db_production --remote \
  --command "UPDATE user SET role='admin' WHERE email='client@company.com';"
# They sign out + back in -> Calendar + Admin tabs appear.
```

## 2. Later deploys (updates)

```bash
pnpm account                          # MUST show the client's account. If not, logout/login.
pnpm exec wrangler d1 migrations apply app_db_production --remote   # only if drizzle/ changed
pnpm run deploy:production
```

Schema change flow, in order: edit `src/db/schema.ts` → `pnpm db:generate`
→ commit the new `drizzle/*.sql` → migrate `--remote` → deploy.

## 3. Safety rules (how dev stays local)

| Command | Target | Why it's safe |
|---|---|---|
| `pnpm dev` | Local miniflare (`.wrangler/`) | Emulates Workers + D1/KV/R2 on your machine |
| `pnpm db:migrate:local` | Local D1 only | Script hardcodes `--local` |
| `pnpm db:execute:local` | Local D1 only | Wrapper hardcodes `--local` |
| `pnpm run deploy` | **Blocked** | Script exits with an error — use `deploy:staging` / `deploy:production` |
| `... --remote` | Remote D1 | Only ever typed by hand, full command, in this file |

Additional guardrails:

- `wrangler.jsonc` top-level bindings are **local-dev placeholders**
  (`local-app-db`, `local-kv`). Real IDs live only under `env.staging` /
  `env.production`, so an undecorated `wrangler deploy` fails instead of
  touching anything real.
- `wrangler d1 execute` defaults to **local** when neither `--local` nor
  `--remote` is passed. Remote always requires the explicit flag.
- `.dev.vars` (local secrets) and `.wrangler/` (local state) are gitignored
  and never leave your machine. Production secrets live only in Cloudflare
  (`wrangler secret`), never in the repo.
- Switching clients? Always `logout` → `login` → `pnpm account` before
  touching anything. When in doubt, `--dry-run`:
  `pnpm exec wrangler deploy --env production --dry-run`.

## 4. Custom domain (optional, still free)

Cloudflare dashboard → Workers & Pages → the production Worker →
Settings → Domains & Routes → Add Custom Domain. HTTPS is automatic.
Then update `BETTER_AUTH_URL` to the custom domain via `secret put`.
