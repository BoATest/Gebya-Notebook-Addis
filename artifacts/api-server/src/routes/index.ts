import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import transcribeRouter from "./transcribe.js";

const router: IRouter = Router();

router.use("/healthz", healthRouter);
router.use("/health", healthRouter);
router.use("/transcribe", transcribeRouter);

export default router;
