let app: any;
try {
  // @ts-ignore
  app = require("../dist/index.cjs");
} catch (err: any) {
  console.error("[api] Failed to load app:", err?.stack || err?.message || err);
  app = (req: any, res: any) => {
    res.status(500).json({ error: "App failed to load", detail: err?.message || "unknown" });
  };
}

export default app;
