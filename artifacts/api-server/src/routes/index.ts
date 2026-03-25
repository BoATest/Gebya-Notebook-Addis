import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import transcribeRouter from "./transcribe.js";  // ← Add .js

const router: IRouter = Router();

router.use("/health");      // ← Add path prefix
router.use("/transcribe");  // ← Add path prefix

export default router;