import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import transcribeRouter from "./transcribe.js";  // ← Add .js

const router: IRouter = Router();

router.use("/healthRouter", healthRouter);      // ← Add path prefix
router.use("/transcribeRouter", transcribeRouter);  // ← Add path prefix

export default router;