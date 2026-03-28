import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { tripsTable } from "./trips";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => usersTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
