const NULL_RESPONSE = {
  transcript: null,
  confidence: null,
  detected_total: null,
};

function applyCors(req: any, res: any) {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = [
    process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : null,
    ...configuredOrigins,
  ].filter(Boolean);

  const origin = req.headers.origin;

  if (!origin) {
    return;
  }

  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Vary", "Origin");
  }
}

function extractLikelyTotal(transcript: string): number | null {
  const text = transcript.toLowerCase().trim();
  const matches = text.match(/(\d[\d,]*(?:\.\d+)?)/g);

  if (!matches) {
    return null;
  }

  const nums = matches.map((m) => parseFloat(m.replace(/,/g, "")));
  return Math.max(...nums);
}

export default function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", ...NULL_RESPONSE });
  }

  const contentType = req.headers["content-type"] ?? "";

  if (contentType.includes("multipart/form-data")) {
    return res.status(400).json({
      error: "multipart/form-data is not supported in this deployment path",
      ...NULL_RESPONSE,
    });
  }

  let body: Record<string, unknown>;

  try {
    body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body ?? {};
  } catch {
    return res.status(400).json({
      error: "invalid JSON body",
      ...NULL_RESPONSE,
    });
  }

  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";

  if (!transcript) {
    return res.status(400).json({
      error: "transcript must be a string",
      ...NULL_RESPONSE,
    });
  }

  return res.status(200).json({
    transcript,
    confidence: null,
    detected_total: extractLikelyTotal(transcript),
  });
}
