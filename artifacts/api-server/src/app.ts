// @ts-nocheck
import express, { type Express } from "express";
import cors from "cors";
// @ts-ignore
import helmet from "helmet";
// @ts-ignore
import rateLimit from "express-rate-limit";
import router from "./routes/index.js";

const app: Express = express();

// ---- CORS CONFIG ----
const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : null,
  ...configuredOrigins,
].filter(Boolean) as string[];

// ---- SAFE HELMET ----
try {
  const h = (helmet as any)?.default ?? helmet;
  if (typeof h === "function") {
    app.use(h());
  }
} catch (e) {
  console.error("Helmet failed:", e);
}

// ---- CORS ----
app.use(
  cors({
    origin:
      allowedOrigins.length > 0
        ? (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error("Not allowed by CORS"));
            }
          }
        : false,
    credentials: true,
  })
);

// ---- SAFE RATE LIMIT ----
try {
  const rl = (rateLimit as any)?.default ?? rateLimit;
  if (typeof rl === "function") {
    const limiter = rl({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
    });
    app.use(limiter);
  }
} catch (e) {
  console.error("RateLimit failed:", e);
}

// ---- BODY PARSING ----
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ---- ROUTES ----
app.use("/api", router);

export default app;