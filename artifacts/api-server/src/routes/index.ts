import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import telegramRouter from "./telegram.js";
import transcribeRouter from "./transcribe.js";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.json({
    name: "Gebya API",
    status: "ok",
    routes: ["/healthz", "/health", "/telegram", "/transcribe"],
  });
});

router.use("/healthz", healthRouter);
router.use("/health", healthRouter);
router.use("/telegram", telegramRouter);
router.use("/transcribe", transcribeRouter);

export default router;
