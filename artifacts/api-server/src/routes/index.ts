import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import telegramRouter from "./telegram.js";
import syncRouter from "./sync.js";
import authRouter from "./auth.js";
import backupRouter from "./backup.js";
import businessRouter from "./business.js";
import remindersRouter from "./reminders.js";
import legacyBridgeRouter from "./business-legacy.js";
import auditRouter from "./audit.js";
import pushSubscriptionsRouter from "./pushSubscriptions.js";
import notificationsRouter from "./notifications.js";
import analyticsRouter from "./analytics.js";
import adminRouter from "./admin.js";
import eventsRouter from "./events.js";
import staffRouter from "./staff.js";
import supportRouter from "./support.js";

const router: IRouter = Router();

router.use("/healthz", healthRouter);
router.use("/telegram", telegramRouter);
router.use("/sync", syncRouter);
router.use("/auth", authRouter);
router.use("/backup", backupRouter);
router.use("/business", businessRouter);
router.use("/telegram/reminders", remindersRouter);
router.use("/", legacyBridgeRouter);
router.use("/audit", auditRouter);
router.use("/push", pushSubscriptionsRouter);
// All notification routes (list, read, create, preferences, cleanup, SSE stream) in one router
router.use("/notifications", notificationsRouter);
router.use("/analytics", analyticsRouter);
router.use("/admin", adminRouter);
router.use("/", eventsRouter);
router.use("/", staffRouter);
router.use("/support", supportRouter);

export default router;
