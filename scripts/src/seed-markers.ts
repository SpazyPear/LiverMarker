import { db, markersTable } from "@workspace/db";

const defaultMarkers = [
  { name: "ALT", unit: "U/L", refMin: 7, refMax: 56 },
  { name: "AST", unit: "U/L", refMin: 10, refMax: 40 },
  { name: "GGT", unit: "U/L", refMin: 9, refMax: 48 },
  { name: "Bilirubin (Total)", unit: "mg/dL", refMin: 0.1, refMax: 1.2 },
  { name: "Albumin", unit: "g/dL", refMin: 3.4, refMax: 5.4 },
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
