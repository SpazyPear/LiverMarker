import { readFileSync, existsSync } from "node:fs";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { DEFAULT_SPREADSHEET_ID } from "./constants";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/** Inline JSON secret, or path to the downloaded OAuth client JSON file. */
function loadOAuthWebCredentialsJson(): string | null {
  const inline = process.env.GOOGLE_OAUTH_WEB_CREDENTIALS_JSON?.trim();
  if (inline) return inline;
  const p = process.env.GOOGLE_OAUTH_WEB_CREDENTIALS_PATH?.trim();
  if (p && existsSync(p)) {
    return readFileSync(p, "utf8");
  }
  return null;
}

function parseWebCredentials(json: string): { clientId: string; clientSecret: string } {
  const parsed = JSON.parse(json) as { web?: { client_id?: string; client_secret?: string } };
  const id = parsed.web?.client_id?.trim();
  const secret = parsed.web?.client_secret?.trim();
  if (!id || !secret) {
    throw new Error("OAuth web JSON must include web.client_id and web.client_secret");
  }
  return { clientId: id, clientSecret: secret };
}

export function getSheetsClient() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (saJson?.trim()) {
    const credentials = JSON.parse(saJson) as { client_email?: string; private_key?: string };
    if (credentials.client_email && credentials.private_key) {
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: SCOPES,
      });
      return google.sheets({ version: "v4", auth });
    }
  }

  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (keyFile) {
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: SCOPES,
    });
    return google.sheets({ version: "v4", auth });
  }

  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (refreshToken) {
    let clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
    let clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

    const webJson = loadOAuthWebCredentialsJson();
    if (webJson) {
      const w = parseWebCredentials(webJson);
      clientId = clientId ?? w.clientId;
      clientSecret = clientSecret ?? w.clientSecret;
    }

    if (!clientId || !clientSecret) {
      throw new Error(
        "OAuth: set GOOGLE_OAUTH_REFRESH_TOKEN and client credentials via GOOGLE_OAUTH_WEB_CREDENTIALS_JSON, GOOGLE_OAUTH_WEB_CREDENTIALS_PATH (file), or GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET",
      );
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.sheets({ version: "v4", auth: oauth2Client });
  }

  throw new Error(
    "Google auth: set GOOGLE_SERVICE_ACCOUNT_JSON (service account), or GOOGLE_APPLICATION_CREDENTIALS (path), or OAuth: GOOGLE_OAUTH_REFRESH_TOKEN plus GOOGLE_OAUTH_WEB_CREDENTIALS_JSON / GOOGLE_OAUTH_WEB_CREDENTIALS_PATH",
  );
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is empty");
  }
  return id;
}
