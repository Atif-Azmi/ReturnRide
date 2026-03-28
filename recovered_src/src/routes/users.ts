import { Router, type IRouter } from "express";
import { db, usersTable, reviewsTable } from "@workspace/db";
import { eq, avg } from "drizzle-orm";

const router: IRouter = Router();

async function getUserWithRating(id: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return null;
  const ratings = await db.select({ avg: avg(reviewsTable.rating) }).from(reviewsTable).where(eq(reviewsTable.driverId, id));
  const avgRating = ratings[0]?.avg ? parseFloat(ratings[0].avg as unknown as string) : null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    licenseNumber: user.licenseNumber ?? null,
    vehicleModel: user.vehicleModel ?? null,
    vehiclePlate: user.vehiclePlate ?? null,
    averageRating: avgRating,
    totalRides: user.totalRides,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const user = await getUserWithRating(id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

router.post("/login", async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "email is required" }); return; }
  const users = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!users.length) { res.status(404).json({ error: "No account found with that email" }); return; }
  const user = await getUserWithRating(users[0].id);
  res.json(user);
});

router.post("/", async (req, res) => {
  const { name, email, phone, role, licenseNumber, vehicleModel, vehiclePlate } = req.body;
  if (!name || !email || !phone || !role) {
    res.status(400).json({ error: "name, email, phone, role are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (existing.length) { res.status(409).json({ error: "An account with this email already exists" }); return; }
  const [user] = await db.insert(usersTable).values({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone,
    role,
    licenseNumber: licenseNumber ?? null,
    vehicleModel: vehicleModel ?? null,
    vehiclePlate: vehiclePlate ?? null,
  }).returning();
  const result = await getUserWithRating(user.id);
  res.status(201).json(result);
});

import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: "Google JWT token is required" }); return; }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) { res.status(400).json({ error: "Invalid Google payload" }); return; }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || "Google User";
    const avatarUrl = payload.picture || null;

    let users = await db.select().from(usersTable).where(eq(usersTable.email, email));
    
    // If not exists, create user automatically
    if (!users.length) {
      const [newUser] = await db.insert(usersTable).values({
        name: name,
        email: email,
        phone: "000-000-0000", // Default or null if not required
        role: "rider", // Default role
        avatarUrl: avatarUrl,
      }).returning();
      
      const result = await getUserWithRating(newUser.id);
      res.status(201).json(result);
      return;
    }

    // Existing user login
    const user = await getUserWithRating(users[0].id);
    res.json(user);
    
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

export default router;
