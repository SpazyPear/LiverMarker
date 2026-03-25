import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const markersTable = pgTable("markers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  refMin: real("ref_min").notNull(),
  refMax: real("ref_max").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMarkerSchema = createInsertSchema(markersTable).omit({ id: true, createdAt: true });
export type InsertMarker = z.infer<typeof insertMarkerSchema>;
export type Marker = typeof markersTable.$inferSelect;
