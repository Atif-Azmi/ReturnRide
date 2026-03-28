import { pgTable, serial, text, timestamp, doublePrecision, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["rider", "driver", "both"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  role: userRoleEnum("role").notNull().default("rider"),
  avatarUrl: text("avatar_url"),
  licenseNumber: text("license_number"),
  vehicleModel: text("vehicle_model"),
  vehiclePlate: text("vehicle_plate"),
  totalRides: integer("total_rides").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, totalRides: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
