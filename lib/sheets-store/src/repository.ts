import {
  HEADERS_EVENTS,
  HEADERS_MARKERS,
  HEADERS_READINGS,
  TAB_EVENTS,
  TAB_MARKERS,
  TAB_READINGS,
} from "./constants";
import { getSheetsClient, getSpreadsheetId } from "./auth";

export interface SheetMarker {
  id: number;
  name: string;
  unit: string;
  refMin: number;
  refMax: number;
  createdAt: string;
}

export interface SheetReading {
  id: number;
  markerId: number;
  value: number;
  recordedAt: string;
}

export interface SheetEvent {
  id: number;
  eventDate: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export type MarkerDashboardThreedayTrend = "up" | "down" | "stable" | "insufficient_data";

export interface SheetMarkerDashboard {
  marker: SheetMarker;
  currentValue: number | null;
  threedayAverage: number | null;
  threedayTrend: MarkerDashboardThreedayTrend;
  percentFromRef: number | null;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function parseIsoDate(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    const d = new Date((v - 25569) * 86400 * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
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

export class SheetsRepository {
  private sheets: ReturnType<typeof getSheetsClient>;
  private spreadsheetId: string;
  private sheetIdCache = new Map<string, number>();
  private ready = false;

  constructor() {
    this.sheets = getSheetsClient();
    this.spreadsheetId = getSpreadsheetId();
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    const { data } = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    const titles = new Set((data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]);
    const requests: { addSheet?: { properties?: { title?: string } } }[] = [];
    for (const title of [TAB_MARKERS, TAB_READINGS, TAB_EVENTS]) {
      if (!titles.has(title)) {
        requests.push({ addSheet: { properties: { title } } });
      }
    }
    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests },
      });
    }
    await this.refreshSheetIdCache();
    await this.ensureHeaders();
    this.ready = true;
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

  private async ensureHeaders(): Promise<void> {
    const checks: { tab: string; headers: readonly string[] }[] = [
      { tab: TAB_MARKERS, headers: HEADERS_MARKERS },
      { tab: TAB_READINGS, headers: HEADERS_READINGS },
      { tab: TAB_EVENTS, headers: HEADERS_EVENTS },
    ];
    for (const { tab, headers } of checks) {
      const { data } = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${tab}!A1:Z1`,
      });
      const first = data.values?.[0]?.[0];
      if (first == null || String(first).trim() === "") {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${tab}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [[...headers]] },
        });
      }
    }
  }

  private getSheetId(title: string): number {
    const id = this.sheetIdCache.get(title);
    if (id == null) throw new Error(`Sheet tab "${title}" not found`);
    return id;
  }

  private async readRows(tab: string, cols: string): Promise<string[][]> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!A2:${cols}50000`,
    });
    return (data.values ?? []).filter((row) => row.some((c) => str(c).trim() !== ""));
  }

  private parseMarkers(rows: string[][]): SheetMarker[] {
    const out: SheetMarker[] = [];
    for (const row of rows) {
      if (row.length < 6) continue;
      const id = num(row[0], NaN);
      if (Number.isNaN(id) || id <= 0) continue;
      out.push({
        id,
        name: str(row[1]),
        unit: str(row[2]),
        refMin: num(row[3]),
        refMax: num(row[4]),
        createdAt: parseIsoDateTime(row[5]),
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  private parseReadings(rows: string[][]): SheetReading[] {
    const out: SheetReading[] = [];
    for (const row of rows) {
      if (row.length < 4) continue;
      const id = num(row[0], NaN);
      if (Number.isNaN(id) || id <= 0) continue;
      out.push({
        id,
        markerId: num(row[1]),
        value: num(row[2]),
        recordedAt: parseIsoDateTime(row[3]),
      });
    }
    return out.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
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

  async listMarkers(): Promise<SheetMarker[]> {
    await this.ensureReady();
    const rows = await this.readRows(TAB_MARKERS, "F");
    return this.parseMarkers(rows);
  }

  async createMarker(input: { name: string; unit: string; refMin: number; refMax: number }): Promise<SheetMarker> {
    await this.ensureReady();
    const rows = await this.readRows(TAB_MARKERS, "F");
    const markers = this.parseMarkers(rows);
    const nextId = markers.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const createdAt = new Date().toISOString();
    const row = [String(nextId), input.name, input.unit, String(input.refMin), String(input.refMax), createdAt];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${TAB_MARKERS}!A:F`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return { id: nextId, ...input, createdAt };
  }

  async deleteMarker(markerId: number): Promise<void> {
    await this.ensureReady();
    const readings = await this.readRows(TAB_READINGS, "D");
    const readingRows = readings
      .map((row, idx) => ({ idx: idx + 2, markerId: num(row[1], NaN) }))
      .filter((r) => r.markerId === markerId)
      .map((r) => r.idx)
      .sort((a, b) => b - a);
    for (const rowIndex of readingRows) {
      await this.deleteRowBy1BasedIndex(TAB_READINGS, rowIndex);
    }
    const markerRows = await this.readRows(TAB_MARKERS, "F");
    const idx = markerRows.findIndex((r) => num(r[0]) === markerId);
    if (idx >= 0) {
      await this.deleteRowBy1BasedIndex(TAB_MARKERS, idx + 2);
    }
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
    await this.refreshSheetIdCache();
  }

  async listReadings(): Promise<SheetReading[]> {
    await this.ensureReady();
    const rows = await this.readRows(TAB_READINGS, "D");
    return this.parseReadings(rows);
  }

  async createReading(input: { markerId: number; value: number; recordedAt?: Date }): Promise<SheetReading> {
    await this.ensureReady();
    const rows = await this.readRows(TAB_READINGS, "D");
    const readings = this.parseReadings(rows);
    const nextId = readings.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const recordedAt = (input.recordedAt ?? new Date()).toISOString();
    const row = [String(nextId), String(input.markerId), String(input.value), recordedAt];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${TAB_READINGS}!A:D`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return { id: nextId, markerId: input.markerId, value: input.value, recordedAt };
  }

  async getDashboard(): Promise<SheetMarkerDashboard[]> {
    await this.ensureReady();
    const markers = await this.listMarkers();
    const allRecentRows = await this.readRows(TAB_READINGS, "D");
    const allReadings = this.parseReadings(allRecentRows);
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
        if (currentValue >= marker.refMin && currentValue <= marker.refMax) {
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

  async listEvents(): Promise<SheetEvent[]> {
    await this.ensureReady();
    const rows = await this.readRows(TAB_EVENTS, "E");
    return this.parseEvents(rows);
  }

  async createEvent(input: { eventDate: string; name: string; description?: string | null }): Promise<SheetEvent> {
    await this.ensureReady();
    const rows = await this.readRows(TAB_EVENTS, "E");
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
    await this.ensureReady();
    const rows = await this.readRows(TAB_EVENTS, "E");
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
    await this.ensureReady();
    const rows = await this.readRows(TAB_EVENTS, "E");
    const idx = rows.findIndex((r) => num(r[0]) === eventId);
    if (idx < 0) return false;
    await this.deleteRowBy1BasedIndex(TAB_EVENTS, idx + 2);
    return true;
  }
}

let _repo: SheetsRepository | null = null;

export function getSheetsRepository(): SheetsRepository {
  if (!_repo) _repo = new SheetsRepository();
  return _repo;
}
