import { Router, type IRouter } from "express";
import { db, markersTable, readingsTable, insertMarkerSchema, insertReadingSchema } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/markers", async (_req, res) => {
  const markers = await db.select().from(markersTable).orderBy(markersTable.name);
  res.json(markers);
});

router.post("/markers", async (req, res) => {
  const data = insertMarkerSchema.parse(req.body);
  const [marker] = await db.insert(markersTable).values(data).returning();
  res.status(201).json(marker);
});

router.delete("/markers/:markerId", async (req, res) => {
  const markerId = parseInt(req.params.markerId, 10);
  await db.delete(markersTable).where(eq(markersTable.id, markerId));
  res.status(204).send();
});

router.get("/readings", async (_req, res) => {
  const readings = await db.select().from(readingsTable).orderBy(desc(readingsTable.recordedAt));
  res.json(readings);
});

router.post("/readings", async (req, res) => {
  const data = insertReadingSchema.parse(req.body);
  const [reading] = await db.insert(readingsTable).values(data).returning();
  res.status(201).json(reading);
});

router.get("/dashboard", async (_req, res) => {
  const markers = await db.select().from(markersTable).orderBy(markersTable.name);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const allRecent = await db
    .select()
    .from(readingsTable)
    .where(gte(readingsTable.recordedAt, threeDaysAgo))
    .orderBy(desc(readingsTable.recordedAt));

  const allTime = await db.select().from(readingsTable).orderBy(desc(readingsTable.recordedAt));

  const dashboard = markers.map((marker) => {
    const recent = allRecent.filter((r) => r.markerId === marker.id);
    const historical = allTime.filter((r) => r.markerId === marker.id);

    const currentValue = historical.length > 0 ? historical[0].value : null;

    const threedayAverage =
      recent.length > 0
        ? recent.reduce((sum, r) => sum + r.value, 0) / recent.length
        : null;

    let threedayTrend: "up" | "down" | "stable" | "insufficient_data" = "insufficient_data";
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
      const midpoint = (marker.refMin + marker.refMax) / 2;
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

  res.json(dashboard);
});

export default router;
