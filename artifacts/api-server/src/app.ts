// @ts-nocheck
import express, { type Express } from "express";
import cors from "cors";
// @ts-ignore - helmet uses dynamic exports
import helmet from "helmet";
// @ts-ignore - express-rate-limit uses dynamic exports  
import rateLimit from "express-rate-limit";
import router from "./routes";

const app: Express = express();

const allowedOrigins = [
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins.length > 0
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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use(limiter);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

export default app;
