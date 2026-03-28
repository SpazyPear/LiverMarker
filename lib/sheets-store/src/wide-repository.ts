import { TAB_EVENTS, HEADERS_EVENTS } from "./constants";
import { getSheetsClient, getSpreadsheetId } from "./auth";
import { getWideTabName } from "./wide-layout";
import type {
  SheetMarker,
  SheetReading,
  SheetEvent,
  SheetMarkerDashboard,
  MarkerDashboardThreedayTrend,
} from "./types";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function monthAbbrev(month: string): number | null {
  const m = month.toLowerCase().slice(0, 3);
  const map: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  return map[m] ?? null;
}

/** Parses e.g. "02 March 26" → ISO (year 20xx from two-digit yy). */
function parseWideDateHeader(cell: unknown): string | null {
  const s = str(cell).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{2})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = monthAbbrev(m[2]);
  if (mon === null) return null;
  const yy = parseInt(m[3], 10);
  const year = 2000 + yy;
  const d = new Date(Date.UTC(year, mon, day, 12, 0, 0));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseRefRange(ref: unknown): { refMin: number; refMax: number } {
  const s = str(ref).trim();
  if (!s) return { refMin: 0, refMax: 9999 };
  const m = s.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (!m) return { refMin: 0, refMax: 9999 };
  return { refMin: parseFloat(m[1]), refMax: parseFloat(m[2]) };
}

function parseCellValue(cell: unknown): number | null {
  if (cell == null) return null;
  const raw = str(cell).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("<")) {
    const n = parseFloat(lower.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(n)) return Math.max(0, n - 0.5);
    return 2;
  }
  const cleaned = raw.replace(/\*/g, "").replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function padRow(row: string[], len: number): string[] {
  const out = [...row];
  while (out.length < len) out.push("");
  return out;
}

/** A1 column letter from 0-based index (0 → A). */
function colLetter(index: number): string {
  let label = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label || "A";
}

function parseIsoDateTime(v: unknown): string {
  if (v == null) return new Date().toISOString();
  if (typeof v === "number") {
    const d = new Date((v - 25569) * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const s = String(v).trim();
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString();
  return new Date().toISOString();
}

function parseIsoDate(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export class WideSheetsRepository {
  private sheets: ReturnType<typeof getSheetsClient>;
  private spreadsheetId: string;
  private tab: string;
  private sheetIdCache = new Map<string, number>();
  private ready = false;

  constructor() {
    this.sheets = getSheetsClient();
    this.spreadsheetId = getSpreadsheetId();
    this.tab = getWideTabName();
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    const { data } = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const titles = new Set((data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]);
    if (!titles.has(this.tab)) {
      throw new Error(
        `Wide layout: tab "${this.tab}" not found. Set GOOGLE_SHEETS_WIDE_TAB to your lab sheet name (e.g. Sheet1).`,
      );
    }
    this.sheetIdCache.clear();
    for (const s of data.sheets ?? []) {
      const t = s.properties?.title;
      const id = s.properties?.sheetId;
      if (t != null && id != null) this.sheetIdCache.set(t, id);
    }
    this.ready = true;
  }

  private getSheetId(title: string): number {
    const id = this.sheetIdCache.get(title);
    if (id == null) throw new Error(`Sheet tab "${title}" not found`);
    return id;
  }

  private async readGrid(): Promise<string[][]> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tab}!A1:ZZ2000`,
    });
    return data.values ?? [];
  }

  private maxCols(rows: string[][]): number {
    return rows.reduce((m, r) => Math.max(m, r.length), 0);
  }

  private parseDateColumns(headerRow: string[]): { index: number; iso: string }[] {
    const out: { index: number; iso: string }[] = [];
    for (let c = 0; c < headerRow.length; c++) {
      const iso = parseWideDateHeader(headerRow[c]);
      if (iso) out.push({ index: c, iso });
    }
    return out;
  }

  private isMarkerRow(name: string): boolean {
    const n = name.trim();
    if (!n) return false;
    if (/^notes$/i.test(n)) return false;
    return true;
  }

  async listMarkers(): Promise<SheetMarker[]> {
    await this.ensureReady();
    const rows = await this.readGrid();
    if (rows.length < 2) return [];
    const mc = this.maxCols(rows);
    const out: SheetMarker[] = [];
    for (let r = 1; r < rows.length; r++) {
      const sheetRow = r + 1;
      const row = padRow(rows[r] ?? [], mc);
      const name = str(row[2]).trim();
      if (!this.isMarkerRow(name)) continue;
      const unit = str(row[0]).trim();
      const { refMin, refMax } = parseRefRange(row[1]);
      out.push({
        id: sheetRow,
        name,
        unit: unit.replace(/\s+H\s*$/i, "").trim() || unit,
        refMin,
        refMax,
        createdAt: new Date().toISOString(),
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  async listReadings(): Promise<SheetReading[]> {
    await this.ensureReady();
    const rows = await this.readGrid();
    if (rows.length < 2) return [];
    const mc = this.maxCols(rows);
    const header = padRow(rows[0] ?? [], mc);
    const dateCols = this.parseDateColumns(header);
    const readings: SheetReading[] = [];
    let readingId = 1;
    for (let r = 1; r < rows.length; r++) {
      const sheetRow = r + 1;
      const row = padRow(rows[r] ?? [], mc);
      const name = str(row[2]).trim();
      if (!this.isMarkerRow(name)) continue;
      for (const dc of dateCols) {
        const v = parseCellValue(row[dc.index]);
        if (v === null) continue;
        readings.push({
          id: readingId++,
          markerId: sheetRow,
          value: v,
          recordedAt: dc.iso,
        });
      }
    }
    return readings.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }

  async getDashboard(): Promise<SheetMarkerDashboard[]> {
    await this.ensureReady();
    const markers = await this.listMarkers();
    const allReadings = await this.listReadings();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeTs = threeDaysAgo.getTime();

    const allRecent = allReadings.filter((r) => new Date(r.recordedAt).getTime() >= threeTs);
    const allTime = [...allReadings].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );

    return markers.map((marker) => {
      const recent = allRecent
        .filter((r) => r.markerId === marker.id)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      const historical = allTime.filter((r) => r.markerId === marker.id);

      const currentValue = historical.length > 0 ? historical[0].value : null;

      const threedayAverage =
        recent.length > 0 ? recent.reduce((sum, r) => sum + r.value, 0) / recent.length : null;

      let threedayTrend: MarkerDashboardThreedayTrend = "insufficient_data";
      if (recent.length >= 2) {
        const oldest = recent[recent.length - 1].value;
        const newest = recent[0].value;
        const diff = newest - oldest;
        const pct = Math.abs(diff) / (oldest || 1);
        if (pct < 0.02) {
          threedayTrend = "stable";
        } else if (diff > 0) {
          threedayTrend = "up";
        } else {
          threedayTrend = "down";
        }
      } else if (recent.length === 1) {
        threedayTrend = "stable";
      }

      let percentFromRef: number | null = null;
      if (currentValue !== null) {
        const halfRange = (marker.refMax - marker.refMin) / 2;
        if (halfRange === 0) {
          percentFromRef = 0;
        } else if (currentValue >= marker.refMin && currentValue <= marker.refMax) {
          percentFromRef = 0;
        } else if (currentValue < marker.refMin) {
          percentFromRef = ((currentValue - marker.refMin) / halfRange) * 100;
        } else {
          percentFromRef = ((currentValue - marker.refMax) / halfRange) * 100;
        }
      }

      return {
        marker,
        currentValue,
        threedayAverage,
        threedayTrend,
        percentFromRef,
      };
    });
  }

  async createMarker(input: { name: string; unit: string; refMin: number; refMax: number }): Promise<SheetMarker> {
    await this.ensureReady();
    const rows = await this.readGrid();
    const mc = this.maxCols(rows);
    const refStr = `${input.refMin}-${input.refMax}`;
    const newRow = [input.unit, refStr, input.name];
    while (newRow.length < mc) newRow.push("");
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${this.tab}!A:ZZ`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [newRow] },
    });
    const nextRows = await this.readGrid();
    const sheetRow = nextRows.length;
    return {
      id: sheetRow,
      name: input.name,
      unit: input.unit,
      refMin: input.refMin,
      refMax: input.refMax,
      createdAt: new Date().toISOString(),
    };
  }

  private async deleteRowBy1BasedIndex(tab: string, row1Based: number): Promise<void> {
    const sheetId = this.getSheetId(tab);
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: row1Based - 1,
                endIndex: row1Based,
              },
            },
          },
        ],
      },
    });
    const { data } = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    this.sheetIdCache.clear();
    for (const s of data.sheets ?? []) {
      const t = s.properties?.title;
      const id = s.properties?.sheetId;
      if (t != null && id != null) this.sheetIdCache.set(t, id);
    }
  }

  async deleteMarker(markerId: number): Promise<void> {
    await this.ensureReady();
    await this.deleteRowBy1BasedIndex(this.tab, markerId);
  }

  async createReading(input: { markerId: number; value: number; recordedAt?: Date }): Promise<SheetReading> {
    await this.ensureReady();
    const rows = await this.readGrid();
    const mc = this.maxCols(rows);
    const header = padRow(rows[0] ?? [], mc);
    const dateCols = this.parseDateColumns(header);
    const target = (input.recordedAt ?? new Date()).toISOString().slice(0, 10);
    const dc = dateCols.find((d) => d.iso.slice(0, 10) === target);
    if (!dc) {
      throw new Error(`No date column matching ${target} in the wide sheet header`);
    }
    const col = colLetter(dc.index);
    const range = `${this.tab}!${col}${input.markerId}`;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[String(input.value)]] },
    });
    const readings = await this.listReadings();
    const nextId = readings.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    return {
      id: nextId,
      markerId: input.markerId,
      value: input.value,
      recordedAt: (input.recordedAt ?? new Date()).toISOString(),
    };
  }

  private async ensureEventsTab(): Promise<void> {
    const { data } = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const titles = new Set((data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]);
    if (titles.has(TAB_EVENTS)) {
      await this.refreshSheetIdCache();
      return;
    }
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: TAB_EVENTS } } }],
      },
    });
    await this.refreshSheetIdCache();
    const { data: h } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${TAB_EVENTS}!A1:E1`,
    });
    const first = h.values?.[0]?.[0];
    if (first == null || String(first).trim() === "") {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${TAB_EVENTS}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [[...HEADERS_EVENTS]] },
      });
    }
  }

  private async refreshSheetIdCache(): Promise<void> {
    const { data } = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    this.sheetIdCache.clear();
    for (const s of data.sheets ?? []) {
      const t = s.properties?.title;
      const id = s.properties?.sheetId;
      if (t != null && id != null) this.sheetIdCache.set(t, id);
    }
  }

  private async readEventRows(): Promise<string[][]> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${TAB_EVENTS}!A2:E50000`,
    });
    return (data.values ?? []).filter((row) => row.some((c) => str(c).trim() !== ""));
  }

  private parseEvents(rows: string[][]): SheetEvent[] {
    const out: SheetEvent[] = [];
    for (const row of rows) {
      if (row.length < 5) continue;
      const id = num(row[0], NaN);
      if (Number.isNaN(id) || id <= 0) continue;
      const desc = str(row[3]);
      out.push({
        id,
        eventDate: parseIsoDate(row[1]),
        name: str(row[2]),
        description: desc === "" ? null : desc,
        createdAt: parseIsoDateTime(row[4]),
      });
    }
    return out.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }

  private notesRowEvents(rows: string[][], mc: number, dateCols: { index: number; iso: string }[]): SheetEvent[] {
    const notesRow = rows.find((r) => str(padRow(r ?? [], mc)[2]).trim().toUpperCase() === "NOTES");
    if (!notesRow) return [];
    const row = padRow(notesRow, mc);
    const out: SheetEvent[] = [];
    let id = 1;
    for (const dc of dateCols) {
      const text = str(row[dc.index]).trim();
      if (!text) continue;
      out.push({
        id: 1_000_000 + id++,
        eventDate: dc.iso.slice(0, 10),
        name: "Note",
        description: text,
        createdAt: new Date().toISOString(),
      });
    }
    return out;
  }

  async listEvents(): Promise<SheetEvent[]> {
    await this.ensureReady();
    const rows = await this.readGrid();
    const mc = this.maxCols(rows);
    const header = padRow(rows[0] ?? [], mc);
    const dateCols = this.parseDateColumns(header);
    const fromNotes = this.notesRowEvents(rows, mc, dateCols);

    const { data } = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const titles = new Set((data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]);
    if (!titles.has(TAB_EVENTS)) {
      return fromNotes.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    }
    const er = await this.readEventRows();
    const fromTab = this.parseEvents(er);
    const merged = [...fromNotes, ...fromTab];
    return merged.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  }

  async createEvent(input: { eventDate: string; name: string; description?: string | null }): Promise<SheetEvent> {
    await this.ensureReady();
    await this.ensureEventsTab();
    const rows = await this.readEventRows();
    const events = this.parseEvents(rows);
    const nextId = events.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const createdAt = new Date().toISOString();
    const desc = input.description ?? null;
    const row = [
      String(nextId),
      input.eventDate.slice(0, 10),
      input.name,
      desc === null ? "" : desc,
      createdAt,
    ];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${TAB_EVENTS}!A:E`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return {
      id: nextId,
      eventDate: input.eventDate.slice(0, 10),
      name: input.name,
      description: desc,
      createdAt,
    };
  }

  async updateEvent(
    eventId: number,
    patch: { eventDate?: string; name?: string; description?: string | null },
  ): Promise<SheetEvent | null> {
    await this.ensureEventsTab();
    const rows = await this.readEventRows();
    const events = this.parseEvents(rows);
    const existing = events.find((e) => e.id === eventId);
    if (!existing) return null;
    const idx = rows.findIndex((r) => num(r[0]) === eventId);
    if (idx < 0) return null;
    const row1Based = idx + 2;
    const next: SheetEvent = {
      id: eventId,
      eventDate: patch.eventDate?.slice(0, 10) ?? existing.eventDate,
      name: patch.name ?? existing.name,
      description: patch.description !== undefined ? patch.description : existing.description,
      createdAt: existing.createdAt,
    };
    const row = [
      String(next.id),
      next.eventDate,
      next.name,
      next.description ?? "",
      next.createdAt,
    ];
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${TAB_EVENTS}!A${row1Based}:E${row1Based}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
    return next;
  }

  async deleteEvent(eventId: number): Promise<boolean> {
    await this.ensureEventsTab();
    const rows = await this.readEventRows();
    const idx = rows.findIndex((r) => num(r[0]) === eventId);
    if (idx < 0) return false;
    await this.deleteRowBy1BasedIndex(TAB_EVENTS, idx + 2);
    return true;
  }
}
