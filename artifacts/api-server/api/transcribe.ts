const NULL_RESPONSE = {
  transcript: null,
  confidence: null,
  detected_total: null,
  draft: null,
};

type ParsedItem = {
  name: string;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
};

type ParsedDraft = {
  customer_name: string | null;
  items: ParsedItem[];
  total_amount: number | null;
  intent: "sale" | "credit" | "payment";
  needs_review: boolean;
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTranscript(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/[፣፤]/g, ", ")
      .replace(/[“”"]/g, " ")
      .replace(/\s*-\s*/g, " ")
  );
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function detectIntent(text: string): "sale" | "credit" | "payment" {
  const lower = text.toLowerCase();
  if (/(payment|paid|pay back|settled|returned money|ክፍያ|ከፈለ|ከፍሏል|መለሰ)/i.test(lower)) {
    return "payment";
  }
  if (/(credit|debt|owed|merro|ሜሮ|ዕዳ|ብድር|later)/i.test(lower)) {
    return "credit";
  }
  return "sale";
}

function extractCustomerName(text: string): string | null {
  const patterns = [
    /(?:customer|for)\s+([a-z][a-z\s'-]{1,30})/i,
    /(?:ደንበኛ|ለ)\s+([\u1200-\u137fa-z][\u1200-\u137fa-z\s'-]{1,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = normalizeWhitespace(match?.[1] ?? "");
    if (candidate && !/\d/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function stripContextWords(segment: string): string {
  return normalizeWhitespace(
    segment
      .replace(/\b(total|amount|price|birr|br|cash|credit|payment|paid|qty|quantity|at|for|customer)\b/gi, " ")
      .replace(/(ጠቅላላ|ዋጋ|ብር|ክፍያ|ዕዳ|ደንበኛ|ለ)/g, " ")
      .replace(/\b(x|pcs?|pieces?)\b/gi, " ")
      .replace(/\d[\d,]*(?:\.\d+)?/g, " ")
      .replace(/[,+]/g, " ")
  );
}

function cleanItemName(segment: string): string {
  return normalizeWhitespace(
    stripContextWords(segment)
      .replace(/\b(and|plus|then)\b/gi, " ")
      .replace(/\b(እና|ከዚያ)\b/g, " ")
  );
}

function splitSegments(text: string): string[] {
  return normalizeTranscript(text)
    .split(/\s*(?:,| and | እና | plus | then )\s*/i)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function parseSegment(segment: string): { item: ParsedItem | null; uncertain: boolean } {
  const normalized = normalizeWhitespace(segment);
  const name = cleanItemName(normalized);
  const numberMatches = [...normalized.matchAll(/\d[\d,]*(?:\.\d+)?/g)];
  const numbers = numberMatches
    .map((match) => ({
      value: parseNumber(match[0]),
      index: match.index ?? -1,
      raw: match[0],
    }))
    .filter((entry): entry is { value: number; index: number; raw: string } => entry.value != null);

  if (!name) {
    return { item: null, uncertain: true };
  }

  if (numbers.length === 0) {
    return {
      item: {
        name,
        quantity: 1,
        unit_price: null,
        line_total: null,
      },
      uncertain: true,
    };
  }

  const hasQuantityCue = /\b(qty|quantity|x|pcs?|pieces?)\b|ቁጥር|እቃ/i.test(normalized);
  const hasPriceCue = /\b(price|birr|br|at|for)\b|ብር|ዋጋ|በ/i.test(normalized);

  if (numbers.length === 1) {
    const [first] = numbers;
    const startsWithNumber = first.index <= 1;
    const quantity = startsWithNumber && !hasPriceCue ? first.value : (hasQuantityCue && !hasPriceCue ? first.value : 1);
    const unitPrice = quantity === first.value ? null : first.value;

    return {
      item: {
        name,
        quantity,
        unit_price: unitPrice,
        line_total: unitPrice != null ? roundMoney((quantity || 1) * unitPrice) : null,
      },
      uncertain: unitPrice == null,
    };
  }

  const quantity = (hasQuantityCue || numbers[0].value < numbers[numbers.length - 1].value) ? numbers[0].value : 1;
  const unitPrice = numbers[numbers.length - 1].value;

  return {
    item: {
      name,
      quantity,
      unit_price: unitPrice,
      line_total: roundMoney((quantity || 1) * unitPrice),
    },
    uncertain: !unitPrice,
  };
}

function extractExplicitTotal(text: string): number | null {
  const match = text.match(/(?:total|sum|amount|ጠቅላላ)\s*(?:is)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  return match ? parseNumber(match[1]) : null;
}

function parseDraft(transcript: string): ParsedDraft {
  const normalized = normalizeTranscript(transcript);
  const intent = detectIntent(normalized);
  const customerName = extractCustomerName(normalized);
  const segments = splitSegments(normalized);
  const parsedSegments = segments.map(parseSegment);
  const items = parsedSegments
    .map((entry) => entry.item)
    .filter((entry): entry is ParsedItem => Boolean(entry && entry.name));

  const explicitTotal = extractExplicitTotal(normalized);
  const calculableTotal = items.length > 0 && items.every((item) => item.line_total != null)
    ? roundMoney(items.reduce((sum, item) => sum + (item.line_total || 0), 0))
    : null;
  const totalAmount = explicitTotal ?? calculableTotal ?? extractLikelyTotal(normalized);
  const uncertainItems = parsedSegments.some((entry) => entry.uncertain);
  const needsReview = intent !== "sale"
    || items.length === 0
    || uncertainItems
    || (explicitTotal != null && calculableTotal != null && Math.abs(explicitTotal - calculableTotal) > 0.01);

  return {
    customer_name: customerName,
    items,
    total_amount: totalAmount,
    intent,
    needs_review: needsReview,
  };
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

  const draft = parseDraft(transcript);

  return res.status(200).json({
    transcript,
    confidence: draft.needs_review ? 0.55 : 0.85,
    detected_total: draft.total_amount,
    draft,
  });
}
