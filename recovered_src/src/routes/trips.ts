import { Router, type IRouter } from "express";
import { db, tripsTable, usersTable, bookingsTable, reviewsTable } from "@workspace/db";
import { eq, avg } from "drizzle-orm";

const router: IRouter = Router();

async function getDriverRating(driverId: number): Promise<number | null> {
  const ratings = await db.select({ avg: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.driverId, driverId));
  if (!ratings[0]?.avg) return null;
  return parseFloat(ratings[0].avg as unknown as string);
}

async function formatTrip(trip: any, driver: any, rating?: number | null) {
  const driverRating = rating !== undefined ? rating : await getDriverRating(trip.driverId);
  return {
    id: trip.id,
    driverId: trip.driverId,
    driverName: driver?.name ?? "Unknown",
    driverRating: driverRating,
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
  };
}

router.get("/", async (req, res) => {
  const { origin, destination, maxPrice, seats, driverId } = req.query;

  let trips = await db.select().from(tripsTable);
  if (!driverId) {
    trips = trips.filter(t => t.status === "available");
  }

  const drivers = await db.select().from(usersTable);
  const driverMap = new Map(drivers.map(d => [d.id, d]));

  let results = await Promise.all(trips.map(t => formatTrip(t, driverMap.get(t.driverId))));

  if (origin) results = results.filter(t => t.origin.toLowerCase().includes((origin as string).toLowerCase()));
  if (destination) results = results.filter(t => t.destination.toLowerCase().includes((destination as string).toLowerCase()));
  if (maxPrice) results = results.filter(t => t.pricePerSeat <= parseFloat(maxPrice as string));
  if (seats) results = results.filter(t => t.availableSeats >= parseInt(seats as string));
  if (driverId) results = results.filter(t => t.driverId === parseInt(driverId as string));

  res.json(results);
});

router.post("/", async (req, res) => {
  const { driverId, origin, destination, departureTime, availableSeats, pricePerSeat, notes } = req.body;
  if (!driverId || !origin || !destination || !departureTime || !availableSeats || !pricePerSeat) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [trip] = await db.insert(tripsTable).values({
    driverId: parseInt(driverId),
    origin,
    destination,
    departureTime: new Date(departureTime),
    availableSeats: parseInt(availableSeats),
    pricePerSeat: parseFloat(pricePerSeat),
    notes: notes ?? null,
    status: "available",
  }).returning();

  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, trip.driverId));
  res.status(201).json(await formatTrip(trip, driver));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
  if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, trip.driverId));
  const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.tripId, id));
  const riders = await db.select().from(usersTable);
  const riderMap = new Map(riders.map(r => [r.id, r]));

  const formattedBookings = bookings.map(b => {
    const rider = riderMap.get(b.userId);
    return {
      id: b.id,
      tripId: b.tripId,
      userId: b.userId,
      userName: rider?.name ?? "Unknown",
      userPhone: rider?.phone ?? "",
      seatsBooked: b.seatsBooked,
      totalPrice: b.totalPrice,
      status: b.status,
      paymentStatus: b.paymentStatus,
      createdAt: b.createdAt.toISOString(),
      trip: null,
    };
  });

  res.json({ ...await formatTrip(trip, driver), bookings: formattedBookings });
});

router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const updates: Record<string, any> = {};
  if (req.body.availableSeats !== undefined) updates.availableSeats = req.body.availableSeats;
  if (req.body.pricePerSeat !== undefined) updates.pricePerSeat = req.body.pricePerSeat;
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.departureTime !== undefined) updates.departureTime = new Date(req.body.departureTime);
  if (req.body.notes !== undefined) updates.notes = req.body.notes;

  const [trip] = await db.update(tripsTable).set(updates).where(eq(tripsTable.id, id)).returning();
  if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, trip.driverId));
  res.json(await formatTrip(trip, driver));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(tripsTable).where(eq(tripsTable.id, id));
  res.status(204).send();
});

export default router;
