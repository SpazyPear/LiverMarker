import { Router, type IRouter } from "express";
import { insertMarkerSchema, insertReadingSchema } from "@workspace/db/schema";
import { getSheetsRepository } from "@workspace/sheets-store";

const router: IRouter = Router();
const store = () => getSheetsRepository();

router.get("/markers", async (_req, res) => {
  const markers = await store().listMarkers();
  res.json(markers);
});

router.post("/markers", async (req, res) => {
  const data = insertMarkerSchema.parse(req.body);
  const marker = await store().createMarker(data);
  res.status(201).json(marker);
});

router.delete("/markers/:markerId", async (req, res) => {
  const markerId = parseInt(req.params.markerId, 10);
  if (Number.isNaN(markerId)) {
    res.status(400).json({ error: "Invalid marker id" });
    return;
  }
  await store().deleteMarker(markerId);
  res.status(204).send();
});

router.get("/readings", async (_req, res) => {
  const readings = await store().listReadings();
  res.json(readings);
});

router.post("/readings", async (req, res) => {
  const data = insertReadingSchema.parse(req.body);
  const reading = await store().createReading({
    markerId: data.markerId,
    value: data.value,
    recordedAt: data.recordedAt,
  });
  res.status(201).json(reading);
});

router.get("/dashboard", async (_req, res) => {
  const dashboard = await store().getDashboard();
  res.json(dashboard);
});

export default router;
