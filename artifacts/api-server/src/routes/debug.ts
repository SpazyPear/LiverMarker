import { type Request, type Response, Router, type IRouter } from "express";
import {
  getSheetsClient,
  getSheetsRepository,
  getSpreadsheetId,
  getWideTabName,
  isWideLayout,
  TAB_MARKERS,
  TAB_READINGS,
} from "@workspace/sheets-store";

const router: IRouter = Router();

function debugAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEBUG_SHEET === "1";
}

function wantsJson(req: Request): boolean {
  const q = req.query.format;
  if (q === "json" || (Array.isArray(q) && q[0] === "json")) return true;
  if (q === "html" || (Array.isArray(q) && q[0] === "html")) return false;
  const accept = req.headers.accept ?? "";
  // Browsers send text/html first; curl often sends */* or omits Accept — default to JSON for scripts.
  if (accept.includes("text/html")) return false;
  if (accept.includes("application/json")) return true;
  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendHtmlJson(res: Response, status: number, title: string, body: unknown): void {
  const text =
    typeof body === "string" ? body : JSON.stringify(body, null, 2);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #e2e8f0; color: #0f172a; padding: 16px; font-size: 13px; line-height: 1.45; }
    h1 { font-size: 16px; margin: 0 0 12px; font-family: system-ui, sans-serif; }
    pre { margin: 0; padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;
      white-space: pre-wrap; word-break: break-word; overflow-x: auto; }
    .meta { margin-top: 12px; font-family: system-ui, sans-serif; font-size: 12px; color: #475569; }
    a { color: #0369a1; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <pre>${escapeHtml(text)}</pre>
  <p class="meta">Add <a href="?format=json"><code>?format=json</code></a> for raw JSON (e.g. curl).</p>
</body>
</html>`;
  res.status(status).type("html").send(html);
}

/** GET /debug/sheet — what the API parsed from the spreadsheet (dev / DEBUG_SHEET=1 only). */
router.get("/debug/sheet", async (req, res) => {
  if (!debugAllowed()) {
    const msg = {
      error: "Debug endpoint disabled",
      hint:
        "Run the API with NODE_ENV=development (e.g. pnpm dev:local) or set DEBUG_SHEET=1 in the environment.",
    };
    if (wantsJson(req)) {
      res.status(403).json(msg);
      return;
    }
    sendHtmlJson(res, 403, "Sheet debug — disabled", msg);
    return;
  }
  try {
    const store = getSheetsRepository();
    const [markers, readings, dashboard] = await Promise.all([
      store.listMarkers(),
      store.listReadings(),
      store.getDashboard(),
    ]);

    const sheetsClient = getSheetsClient();
    const spreadsheetId = getSpreadsheetId();

    const { data: meta } = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
    const sheetTabNames = (meta.sheets ?? [])
      .map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t));

    const payload: Record<string, unknown> = {
      layout: isWideLayout() ? "wide" : "normalized",
      spreadsheetId,
      sheetTabNames,
      env: {
        GOOGLE_SHEETS_LAYOUT: process.env.GOOGLE_SHEETS_LAYOUT ?? "(unset)",
        GOOGLE_SHEETS_WIDE_TAB: process.env.GOOGLE_SHEETS_WIDE_TAB ?? "(unset default Sheet1)",
        GOOGLE_SHEETS_SPREADSHEET_ID: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "(using default constant)",
      },
      markers,
      markersCount: markers.length,
      readingsCount: readings.length,
      readings: readings.slice(0, 500),
      dashboardPreview: dashboard.slice(0, 50),
    };

    if (!isWideLayout() && readings.length === 0) {
      payload.hints = [
        "The Readings tab only has a header row — no data rows. In normalized mode, the dashboard reads values from the Readings tab.",
        "If your history is in a wide-format tab (one column per date), add to .env: GOOGLE_SHEETS_LAYOUT=wide and GOOGLE_SHEETS_WIDE_TAB=<exact tab name from sheetTabNames>, then restart the API.",
        "Otherwise add readings through the app (Log reading) so rows appear under Readings.",
      ];
    }

    if (isWideLayout()) {
      const tab = getWideTabName();
      const { data } = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!A1:ZZ50`,
      });
      payload.wideTab = tab;
      payload.wideGridRawRows = data.values ?? [];
      payload.wideNote =
        "Row 0 = header; col A=unit, B=ref, C=name; date columns must match pattern like '02 March 26' in row 0.";
    } else {
      const [markersHead, readingsHead] = await Promise.all([
        sheetsClient.spreadsheets.values.get({ spreadsheetId, range: `${TAB_MARKERS}!A1:F15` }),
        sheetsClient.spreadsheets.values.get({ spreadsheetId, range: `${TAB_READINGS}!A1:D30` }),
      ]);
      payload.normalizedRaw = {
        markersTab: `${TAB_MARKERS}!A1:F15`,
        markersRows: markersHead.data.values ?? [],
        readingsTab: `${TAB_READINGS}!A1:D30`,
        readingsRows: readingsHead.data.values ?? [],
      };
    }

    if (wantsJson(req)) {
      res.json(payload);
      return;
    }
    sendHtmlJson(res, 200, "Sheet debug — API view of spreadsheet", payload);
  } catch (err) {
    const body = {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    };
    if (wantsJson(req)) {
      res.status(500).json(body);
      return;
    }
    sendHtmlJson(res, 500, "Sheet debug — error", body);
  }
});

export default router;
