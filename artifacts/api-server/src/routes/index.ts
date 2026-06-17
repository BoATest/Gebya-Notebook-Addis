import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import telegramRouter from "./telegram.js";
import transcribeRouter from "./transcribe.js";
import syncRouter from "./sync.js";
import authRouter from "./auth.js";

const router: IRouter = Router();

router.use("/healthz", healthRouter);
router.use("/health", healthRouter);
router.use("/telegram", telegramRouter);
router.use("/transcribe", transcribeRouter);
router.use("/sync", syncRouter);
router.use("/auth", authRouter);

export default router;
