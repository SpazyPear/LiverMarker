import { pgTable, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { markersTable } from "./markers";

export const readingsTable = pgTable("readings", {
  id: serial("id").primaryKey(),
  markerId: integer("marker_id").notNull().references(() => markersTable.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const insertReadingSchema = createInsertSchema(readingsTable).omit({ id: true }).extend({
  recordedAt: z.coerce.date().optional(),
});
export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Reading = typeof readingsTable.$inferSelect;
