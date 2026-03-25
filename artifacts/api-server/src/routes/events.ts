import { Router, type IRouter } from "express";
import { db, eventsTable, insertEventSchema } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/events", async (_req, res) => {
  const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.eventDate));
  res.json(events);
});

router.post("/events", async (req, res) => {
  const data = insertEventSchema.parse(req.body);
  const [event] = await db.insert(eventsTable).values(data).returning();
  res.status(201).json(event);
});

export default router;
