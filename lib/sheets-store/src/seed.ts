import { getSheetsRepository } from "./repository-factory";
import { isWideLayout } from "./wide-layout";

const DEFAULT_MARKERS = [
  { name: "ALT", unit: "U/L", refMin: 12, refMax: 28 },
  { name: "AST", unit: "U/L", refMin: 27, refMax: 50 },
  { name: "GGT", unit: "U/L", refMin: 6, refMax: 31 },
  { name: "ALP", unit: "U/L", refMin: 120, refMax: 370 },
  { name: "Bilirubin (Total)", unit: "UMOL/L", refMin: 0, refMax: 20 },
  { name: "Albumin", unit: "G/L", refMin: 33, refMax: 48 },
  { name: "INR", unit: "", refMin: 0.8, refMax: 1.1 },
];

/** Inserts default liver markers when the Markers sheet has no data rows (optional demo bootstrap). */
export async function maybeSeedDefaultMarkers(): Promise<void> {
  if (isWideLayout()) return;
  const store = getSheetsRepository();
  const existing = await store.listMarkers();
  if (existing.length > 0) return;
  for (const m of DEFAULT_MARKERS) {
    await store.createMarker(m);
  }
}
