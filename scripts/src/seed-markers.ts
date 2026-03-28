import { getSheetsRepository } from "@workspace/sheets-store";

const defaultMarkers = [
  { name: "ALT", unit: "U/L", refMin: 12, refMax: 28 },
  { name: "AST", unit: "U/L", refMin: 27, refMax: 50 },
  { name: "GGT", unit: "U/L", refMin: 6, refMax: 31 },
  { name: "ALP", unit: "U/L", refMin: 120, refMax: 370 },
  { name: "Bilirubin (Total)", unit: "UMOL/L", refMin: 0, refMax: 20 },
  { name: "Albumin", unit: "G/L", refMin: 33, refMax: 48 },
  { name: "INR", unit: "", refMin: 0.8, refMax: 1.1 },
];

async function seed() {
  console.log("Seeding default liver markers (Google Sheet)...");
  const store = getSheetsRepository();
  const existing = await store.listMarkers();
  if (existing.length > 0) {
    console.log(`Markers already present (${existing.length}). Skipping.`);
    process.exit(0);
  }

  for (const marker of defaultMarkers) {
    await store.createMarker(marker);
    console.log(`  ✓ ${marker.name}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
