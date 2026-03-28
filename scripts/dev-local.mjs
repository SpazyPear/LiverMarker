#!/usr/bin/env node
/**
 * Run API + Vite together on localhost (Windows / macOS / Linux).
 * From repo root: node scripts/dev-local.mjs
 * Or: pnpm dev:local
 *
 * If this file exists, sets GOOGLE_OAUTH_WEB_CREDENTIALS_PATH for OAuth (you still need GOOGLE_OAUTH_REFRESH_TOKEN):
 *   %USERPROFILE%\Downloads\client_secret_752589590022-3jbtf74phgp8gk7ie8tnn8b0iku7q1m0.apps.googleusercontent.com.json
 *
 * Prefer GOOGLE_SERVICE_ACCOUNT_JSON on Replit (no local file path).
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

if (!existsSync(path.join(root, "pnpm-workspace.yaml"))) {
  console.error("Could not find pnpm-workspace.yaml. Run this from the LiverMarker repo root.");
  process.exit(1);
}

const oauthClientFilename =
  "client_secret_752589590022-3jbtf74phgp8gk7ie8tnn8b0iku7q1m0.apps.googleusercontent.com.json";
const oauthClientPath = path.join(os.homedir(), "Downloads", oauthClientFilename);

const env = { ...process.env };
if (!env.GOOGLE_OAUTH_WEB_CREDENTIALS_PATH?.trim() && !env.GOOGLE_OAUTH_WEB_CREDENTIALS_JSON?.trim()) {
  if (existsSync(oauthClientPath)) {
    env.GOOGLE_OAUTH_WEB_CREDENTIALS_PATH = oauthClientPath;
    console.log("[dev-local] GOOGLE_OAUTH_WEB_CREDENTIALS_PATH =", oauthClientPath);
  }
}

if (!env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() && !env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim()) {
  console.warn(
    "[dev-local] Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_OAUTH_REFRESH_TOKEN (OAuth still needs the refresh token).",
  );
}

const child = spawn("pnpm", ["run", "dev:local"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env,
});

child.on("exit", (code) => process.exit(code ?? 0));
