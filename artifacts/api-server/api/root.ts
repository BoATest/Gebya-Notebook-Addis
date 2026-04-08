function applyCors(req: any, res: any) {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = [
    process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
    ...configuredOrigins,
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (!origin) return;

  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Vary", "Origin");
  }
}

export default function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pathname = new URL(req.url || "/", "http://localhost").pathname;

  if (pathname === "/" || pathname === "/api") {
    return res.status(200).json({
      name: "Gebya API",
      status: "ok",
      routes: [
        "/",
        "/healthz",
        "/health",
        "/api/healthz",
        "/api/transcribe",
        "/api/telegram/status",
      ],
    });
  }

  if (pathname === "/healthz" || pathname === "/health" || pathname === "/api/health") {
    return res.status(200).json({ status: "ok" });
  }

  return res.status(404).json({ error: "Not found" });
}
