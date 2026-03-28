import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  const { driverId } = req.query;
  if (!driverId) { res.status(400).json({ error: "driverId is required" }); return; }

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.driverId, parseInt(driverId as string)));
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  const result = reviews.map(r => ({
    id: r.id,
    driverId: r.driverId,
    userId: r.userId,
    userName: userMap.get(r.userId)?.name ?? "Unknown",
    tripId: r.tripId,
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/", async (req, res) => {
  const { driverId, userId, tripId, rating, comment } = req.body;
  if (!driverId || !userId || !tripId || !rating) {
    res.status(400).json({ error: "driverId, userId, tripId, rating are required" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    driverId: parseInt(driverId),
    userId: parseInt(userId),
    tripId: parseInt(tripId),
    rating: parseInt(rating),
    comment: comment ?? null,
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, review.userId));
  res.status(201).json({
    id: review.id,
    driverId: review.driverId,
    userId: review.userId,
    userName: user?.name ?? "Unknown",
    tripId: review.tripId,
    rating: review.rating,
    comment: review.comment ?? null,
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
