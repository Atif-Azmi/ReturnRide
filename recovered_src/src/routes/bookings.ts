import { Router, type IRouter } from "express";
import { db, bookingsTable, tripsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function formatBooking(booking: any, user: any, trip?: any, driver?: any) {
  return {
    id: booking.id,
    tripId: booking.tripId,
    userId: booking.userId,
    userName: user?.name ?? "Unknown",
    userPhone: user?.phone ?? "",
    seatsBooked: booking.seatsBooked,
    totalPrice: booking.totalPrice,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt.toISOString(),
    trip: trip ? {
      id: trip.id,
      driverId: trip.driverId,
      driverName: driver?.name ?? "Unknown",
      driverRating: null,
      driverAvatarUrl: driver?.avatarUrl ?? null,
      vehicleModel: driver?.vehicleModel ?? null,
      vehiclePlate: driver?.vehiclePlate ?? null,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: trip.departureTime instanceof Date ? trip.departureTime.toISOString() : trip.departureTime,
      availableSeats: trip.availableSeats,
      pricePerSeat: trip.pricePerSeat,
      status: trip.status,
      notes: trip.notes ?? null,
      createdAt: trip.createdAt instanceof Date ? trip.createdAt.toISOString() : trip.createdAt,
    } : null,
  };
}

router.get("/", async (req, res) => {
  const { userId, driverId } = req.query;

  let bookings = await db.select().from(bookingsTable);
  const users = await db.select().from(usersTable);
  const trips = await db.select().from(tripsTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  const tripMap = new Map(trips.map(t => [t.id, t]));

  if (userId) bookings = bookings.filter(b => b.userId === parseInt(userId as string));
  if (driverId) {
    const driverTrips = trips.filter(t => t.driverId === parseInt(driverId as string));
    const tripIds = new Set(driverTrips.map(t => t.id));
    bookings = bookings.filter(b => tripIds.has(b.tripId));
  }

  const result = bookings.map(b => {
    const trip = tripMap.get(b.tripId);
    const driver = trip ? userMap.get(trip.driverId) : undefined;
    return formatBooking(b, userMap.get(b.userId), trip, driver);
  });

  res.json(result);
});

router.post("/", async (req, res) => {
  const { tripId, userId, seatsBooked } = req.body;
  if (!tripId || !userId || !seatsBooked) {
    res.status(400).json({ error: "tripId, userId, seatsBooked are required" });
    return;
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, parseInt(tripId)));
  if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }
  if (trip.availableSeats < seatsBooked) {
    res.status(400).json({ error: "Not enough seats available" });
    return;
  }

  const totalPrice = trip.pricePerSeat * parseInt(seatsBooked);

  const [booking] = await db.insert(bookingsTable).values({
    tripId: parseInt(tripId),
    userId: parseInt(userId),
    seatsBooked: parseInt(seatsBooked),
    totalPrice,
    status: "confirmed",
    paymentStatus: "unpaid",
  }).returning();

  await db.update(tripsTable)
    .set({ availableSeats: trip.availableSeats - parseInt(seatsBooked) })
    .where(eq(tripsTable.id, trip.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, booking.userId));
  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, trip.driverId));
  res.status(201).json(formatBooking(booking, user, trip, driver));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, booking.userId));
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, booking.tripId));
  const driver = trip ? (await db.select().from(usersTable).where(eq(usersTable.id, trip.driverId)))[0] : null;

  res.json(formatBooking(booking, user, trip, driver ?? undefined));
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Record<string, any> = {};
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.paymentStatus !== undefined) updates.paymentStatus = req.body.paymentStatus;

  const [booking] = await db.update(bookingsTable).set(updates).where(eq(bookingsTable.id, id)).returning();
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, booking.userId));
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, booking.tripId));
  const driver = trip ? (await db.select().from(usersTable).where(eq(usersTable.id, trip.driverId)))[0] : null;

  res.json(formatBooking(booking, user, trip, driver ?? undefined));
});

export default router;
