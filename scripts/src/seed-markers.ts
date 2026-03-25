import { db, markersTable } from "@workspace/db";

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
  console.log("Seeding default liver markers...");
  const existing = await db.select().from(markersTable);
  if (existing.length > 0) {
    console.log(`Markers already seeded (${existing.length} found). Skipping.`);
    process.exit(0);
  }

  for (const marker of defaultMarkers) {
    await db.insert(markersTable).values(marker);
    console.log(`  ✓ ${marker.name}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
