import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tripsRouter from "./trips";
import bookingsRouter from "./bookings";
import usersRouter from "./users";
import reviewsRouter from "./reviews";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/trips", tripsRouter);
router.use("/bookings", bookingsRouter);
router.use("/users", usersRouter);
router.use("/reviews", reviewsRouter);
router.use("/stats", statsRouter);

export default router;
