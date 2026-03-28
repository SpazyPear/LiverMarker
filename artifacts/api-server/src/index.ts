import app from "./app";
import { logger } from "./lib/logger";
import { maybeSeedDefaultMarkers } from "@workspace/sheets-store";

const rawPort = process.env["PORT"] ?? "8787";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function oauthTokenError(err: unknown): string | undefined {
  const g = err as { response?: { data?: { error?: string } }; message?: string };
  const fromBody = g?.response?.data?.error;
  if (fromBody) return fromBody;
  const msg = g?.message ?? "";
  if (msg.includes("invalid_grant")) return "invalid_grant";
  if (msg.includes("unauthorized_client")) return "unauthorized_client";
  return undefined;
}

async function run(): Promise<void> {
  await maybeSeedDefaultMarkers().catch((err) => {
    const code = oauthTokenError(err);
    if (code === "invalid_grant") {
      logger.error(
        { err },
        "Default marker seed failed: refresh token expired/revoked. Issue a new GOOGLE_OAUTH_REFRESH_TOKEN for the same OAuth client as GOOGLE_OAUTH_WEB_CREDENTIALS_PATH.",
      );
    } else if (code === "unauthorized_client") {
      logger.error(
        { err },
        "Default marker seed failed: refresh token was issued for a different OAuth client than your credentials JSON. In OAuth Playground, enable \"Use your own OAuth credentials\" and use this project’s Web client id/secret, then paste the new refresh token.",
      );
    } else {
      logger.error({ err }, "Default marker seed failed");
    }
  });

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

run().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
