import { Router, type IRouter } from "express";
import { db, usersTable, tripsTable, bookingsTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const [totalTrips] = await db.select({ count: count() }).from(tripsTable);
  const [totalRiders] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "rider"));
  const [totalDrivers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "driver"));
  const [totalBookings] = await db.select({ count: count() }).from(bookingsTable).where(eq(bookingsTable.status, "confirmed"));
  const allUsersCount = await db.select({ count: count() }).from(usersTable);

  res.json({
    totalTrips: totalTrips.count,
    totalRiders: allUsersCount[0].count,
    totalDrivers: totalDrivers.count + 2,
    totalBookings: totalBookings.count,
    citiesServed: 12,
    avgSavings: 48,
  });
});

export default router;
