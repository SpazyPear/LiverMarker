import { Router, type IRouter } from "express";
import { insertEventSchema, updateEventSchema } from "@workspace/db/schema";
import { getSheetsRepository } from "@workspace/sheets-store";

const router: IRouter = Router();
const store = () => getSheetsRepository();

router.get("/events", async (_req, res) => {
  const events = await store().listEvents();
  res.json(events);
});

router.post("/events", async (req, res) => {
  const data = insertEventSchema.parse(req.body);
  const event = await store().createEvent(data);
  res.status(201).json(event);
});

router.patch("/events/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (Number.isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const data = updateEventSchema.parse(req.body);
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const updated = await store().updateEvent(eventId, data);
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(updated);
});

router.delete("/events/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (Number.isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const ok = await store().deleteEvent(eventId);
  if (!ok) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(204).send();
});

export default router;
