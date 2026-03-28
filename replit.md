# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Persistence (API)**: Google Sheets (via `@workspace/sheets-store`); `lib/db` still supplies Drizzle **schemas** for Zod validation only
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle table definitions + Zod insert schemas (validation)
│   └── sheets-store/     # Google Sheets read/write for markers, readings, events
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Deploying on Replit (Google Sheets)

The API no longer uses PostgreSQL at runtime. Configure **Secrets** before running or publishing.

**Spreadsheet ID** defaults in code to the Maisies sheet (`DEFAULT_SPREADSHEET_ID` in `lib/sheets-store`) if `GOOGLE_SHEETS_SPREADSHEET_ID` is unset. Override the secret if you use another doc.

### Option A — Service account (recommended for servers)

1. **Google Cloud**: Enable **Google Sheets API**; create a **service account**; download its **JSON** key (fields like `client_email`, `private_key`).
2. **Share the sheet** with that service account **`client_email`** as **Editor**.
3. Replit **Secrets**: `GOOGLE_SERVICE_ACCOUNT_JSON` = entire JSON string.

### Option B — OAuth “Desktop” / Web client JSON + refresh token

If you only have the **OAuth client** file (`client_secret_….apps.googleusercontent.com.json` with `web.client_id` / `web.client_secret`), that is **not** the same as a service account. The app supports OAuth when you also set a **refresh token**:

1. Enable **Google Sheets API** for the project.
2. In [Google OAuth Playground](https://developers.google.com/oauthplayground/), open the gear icon, check “Use your own OAuth credentials”, paste **client id** and **client secret** from the Google Cloud Console (same as in your JSON file).
3. Select scope `https://www.googleapis.com/auth/spreadsheets`, authorize with your Google account, then **Exchange authorization code for tokens** and copy the **Refresh token**.
4. Replit **Secrets**:
   - `GOOGLE_OAUTH_WEB_CREDENTIALS_JSON` — paste the **full** contents of your downloaded JSON (the `web: { client_id, client_secret, … }` object as one string).
   - `GOOGLE_OAUTH_REFRESH_TOKEN` — the refresh token from the Playground.

Do **not** commit client secrets or refresh tokens to git (see `.gitignore`). If a secret was ever pasted into chat or a public repo, **rotate** the client secret in Google Cloud → Credentials.

Replit sets `PORT` automatically. On first boot, if the **Markers** tab has no data rows, the API seeds default liver markers.

The Repl may still list the **PostgreSQL** module in `.replit`; it is optional for this app’s API and can be removed later if you prefer a slimmer Repl.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for response validation, `@workspace/db/schema` for request body Zod schemas, and **`@workspace/sheets-store`** for persistence.

- Entry: `src/index.ts` — reads `PORT` (defaults to `8787` if unset), starts Express, optional default marker seed for empty sheets
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /healthz` (full path: `/api/healthz`)
- Depends on: `@workspace/db` (schema subpath), `@workspace/sheets-store`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.mjs`)
- Build externalizes `googleapis` and other large deps

### `lib/db` (`@workspace/db`)

Drizzle **table definitions** and **Zod insert schemas** used for API validation. The optional `pool` / `db` exports exist for legacy scripts or local Postgres tooling; the deployed API uses Google Sheets instead.

- `src/schema/` — markers, readings, events models + `insert*` / `updateEventSchema`
- `drizzle.config.ts` — Drizzle Kit (optional `pnpm --filter @workspace/db run push` if you use Postgres locally)
- Exports: `.` (optional pool/db + schema re-exports), `./schema` (schema only)

### `lib/sheets-store` (`@workspace/sheets-store`)

Google Sheets API client and repository: tabs **Markers**, **Readings**, **Events** (created automatically with header rows if missing).

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. For example, `seed-markers` uses `@workspace/sheets-store` (same Google env vars as the API).
