import { pgTable, serial, text, timestamp, doublePrecision, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const tripStatusEnum = pgEnum("trip_status", ["available", "booked", "completed", "cancelled"]);

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => usersTable.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  availableSeats: integer("available_seats").notNull(),
  pricePerSeat: doublePrecision("price_per_seat").notNull(),
  status: tripStatusEnum("status").notNull().default("available"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
