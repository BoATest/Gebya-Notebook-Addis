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

const router: IRouter = Router();

router.use("/healthz", healthRouter);
router.use("/health", healthRouter);
router.use("/telegram", telegramRouter);
router.use("/sync", syncRouter);
router.use("/auth", authRouter);
router.use("/backup", backupRouter);
router.use("/business", businessRouter);
router.use("/telegram/reminders", remindersRouter);
// Legacy identity bridge: Postgres-backed replacements for /shops, /shops/join etc.
// Maintains the same response shapes as the old identity.ts so the frontend
// identityApi.js continues to work without changes.
router.use("/", legacyBridgeRouter);
// Audit routes: owner violation log
router.use("/audit", auditRouter);
// Push notification subscription management
router.use("/push", pushSubscriptionsRouter);
// Notification list and read status
router.use("/notifications", notificationsRouter);
// Bank analytics — merchant consent + bank-facing reports + NBE aggregation
router.use("/analytics", analyticsRouter);
// Platform admin dashboard
router.use("/admin", adminRouter);
// Staff activity events (Phase 2 — Postgres-backed)
router.use("/", eventsRouter);

export default router;
