// Dynamic import to load the bundled app (CJS) in ESM context
let app: any;
try {
  const mod = await import("../dist/index.cjs");
  app = mod.default ?? mod;
} catch (err: any) {
  console.error("[api] Failed to load app:", err?.stack || err?.message || err);
  app = (req: any, res: any) => {
    res.status(500).json({ error: "App failed to load", detail: err?.message || "unknown" });
  };
}

export default app;
