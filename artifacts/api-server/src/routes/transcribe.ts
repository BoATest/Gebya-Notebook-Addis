import { Router, Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { getTranscriptionService } from "../services/transcriptionService.js";

const router = Router();

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  body: Request["body"] & {
    browserFallback?: unknown;
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are accepted"));
    }
  },
});

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

function handleMulterError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message, ...NULL_RESPONSE });
    return;
  }
  if (err instanceof Error && err.message === "Only audio files are accepted") {
    res.status(400).json({ error: err.message, ...NULL_RESPONSE });
    return;
  }
  next(err);
}

// ---- NUMBER EXTRACTION (unchanged) ----

function extractLikelyTotal(transcript: string): number | null {
  const text = transcript.toLowerCase().trim();
  const matches = text.match(/(\d[\d,]*(?:\.\d+)?)/g);

  if (matches) {
    const nums = matches.map((m) => parseFloat(m.replace(/,/g, "")));
    return Math.max(...nums);
  }

  return null;
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
  if (/(credit|debt|owed|merro|መሮ|ዕዳ|ብድር|later)/i.test(lower)) {
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
    }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null);

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

// ---- ROUTE ----

router.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers["content-type"] ?? "";
    if (contentType.includes("multipart/form-data")) {
      upload.single("audio")(req, res, next);
    } else {
      next();
    }
  },
  handleMulterError,
  async (req: MulterRequest, res: Response) => {
    try {
      const contentType = req.headers["content-type"] ?? "";

      // ---------------- FILE UPLOAD FLOW ----------------
      if (contentType.includes("multipart/form-data")) {
        if (!req.file) {
          return res.status(400).json({
            error: "audio file is required",
            ...NULL_RESPONSE,
          });
        }

        // Safe service init
        let svc;
        try {
          svc = getTranscriptionService();
        } catch (e) {
          console.error("SERVICE INIT ERROR:", e);
          return res.status(500).json({
            error: "Service init failed",
            request_id: res.locals.requestId,
            ...NULL_RESPONSE,
          });
        }

        // Safe transcribe
        let transcript = "";
        let confidence: number | null = null;
        let transcriptionProvider: "whisper" | "browser_fallback" | "unavailable" = "unavailable";
        const browserFallback = typeof req.body.browserFallback === "string"
          ? req.body.browserFallback.trim()
          : "";

        try {
          const result = await svc.transcribeAudio(req.file, browserFallback);
          transcript = result.transcript;
          confidence = result.confidence;
          transcriptionProvider = result.provider;
        } catch (e) {
          console.error("TRANSCRIBE ERROR:", e);
        }

        if (!transcript) {
          console.warn("TRANSCRIBE EMPTY: no transcript from whisper or browser fallback");
          return res.status(200).json({
            error: "Transcription unavailable",
            request_id: res.locals.requestId,
            transcription_provider: transcriptionProvider,
            ...NULL_RESPONSE,
          });
        }

        const detected_total = extractLikelyTotal(transcript);
        const draft = parseDraft(transcript);

        return res.json({
          transcript,
          confidence: confidence ?? (draft.needs_review ? 0.55 : 0.85),
          detected_total: draft.total_amount ?? detected_total,
          draft,
          transcription_provider: transcriptionProvider,
        });
      }

      // ---------------- TEXT INPUT FLOW ----------------

      const { transcript } = req.body as { transcript?: unknown };

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({
          error: "transcript must be a string",
          ...NULL_RESPONSE,
        });
      }

      const trimmed = transcript.trim();
      const draft = parseDraft(trimmed);
      const detected_total = extractLikelyTotal(trimmed);

      return res.json({
        transcript: trimmed,
        confidence: draft.needs_review ? 0.55 : 0.85,
        detected_total: draft.total_amount ?? detected_total,
        draft,
        transcription_provider: "text_parse",
      });

    } catch (e) {
      console.error("FATAL ERROR:", e);
      return res.status(500).json({
        error: "Internal server error",
        request_id: res.locals.requestId,
        ...NULL_RESPONSE,
      });
    }
  }
);

export default router;

