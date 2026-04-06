import { Router, Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { getTranscriptionService } from "../services/transcriptionService.js";
import { NULL_TRANSCRIBE_RESPONSE } from "../utils/voiceDraft.js";

const router = Router();

interface MulterRequest extends Request {
  file?: Express.Multer.File;
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

function handleMulterError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message, ...NULL_TRANSCRIBE_RESPONSE });
    return;
  }
  if (err instanceof Error && err.message === "Only audio files are accepted") {
    res.status(400).json({ error: err.message, ...NULL_TRANSCRIBE_RESPONSE });
    return;
  }
  next(err);
}

interface ParsedVoiceItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
}

interface VoiceDraft {
  intent: "sale" | "credit" | "payment";
  customer_name: string | null;
  items: ParsedVoiceItem[];
  total_amount: number | null;
  needs_review: boolean;
}

// ---- NUMBER EXTRACTION ----

function extractLikelyTotal(transcript: string): number | null {
  const text = transcript.toLowerCase().trim();
  const matches = text.match(/(\d[\d,]*(?:\.\d+)?)/g);

  if (matches) {
    const nums = matches.map((m) => parseFloat(m.replace(/,/g, "")));
    return Math.max(...nums);
  }

  return null;
}

function normalizeTranscriptText(transcript: string): string {
  return transcript
    .replace(/\s+/g, " ")
    .replace(/[፣፤]/g, ",")
    .trim();
}

function detectIntent(text: string): VoiceDraft["intent"] {
  const normalized = text.toLowerCase();
  if (/\b(payment|paid|pay|settled)\b/.test(normalized) || /(ከፈለ|ከፍዬ|ክፍያ)/.test(text)) {
    return "payment";
  }
  if (/\b(credit|dubie|merro|debt|owed)\b/.test(normalized) || /(ዱቤ|እዳ|መርሮ)/.test(text)) {
    return "credit";
  }
  return "sale";
}

function extractCustomerName(text: string): string | null {
  const englishMatch = text.match(/\b(?:for|to|from)\s+([A-Za-z][A-Za-z'\-]{1,}(?:\s+[A-Za-z][A-Za-z'\-]{1,}){0,2})/i);
  if (englishMatch?.[1]) return englishMatch[1].trim();

  const amharicMatch = text.match(/(?:ለ|ከ)\s*([\u1200-\u137F]{2,}(?:\s+[\u1200-\u137F]{2,}){0,2})/u);
  if (amharicMatch?.[1]) return amharicMatch[1].trim();

  return null;
}

function splitTranscriptIntoSegments(text: string): string[] {
  return text
    .split(/\s*(?:,| and | then | plus | with )\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function parseSegment(segment: string): ParsedVoiceItem | null {
  const cleaned = segment.replace(/\b(?:sold|sale|for|birr|cash|paid|credit|dubie|payment)\b/gi, "").trim();
  const numberMatches = [...cleaned.matchAll(/(\d[\d,]*(?:\.\d+)?)/g)];
  if (numberMatches.length === 0) {
    return null;
  }

  const values = numberMatches
    .map((match) => Number.parseFloat(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const firstNumber = numberMatches[0];
  const possibleName = cleaned
    .slice(0, firstNumber.index ?? 0)
    .replace(/["']/g, "")
    .trim();

  const fallbackName = cleaned
    .replace(/(\d[\d,]*(?:\.\d+)?)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const name = (possibleName || fallbackName || "Voice item").slice(0, 80).trim();
  const quantity = values.length > 1 ? Math.max(1, values[0]) : 1;
  const lineTotal = values[values.length - 1] ?? null;
  const unitPrice = values.length > 1 && lineTotal != null ? lineTotal / quantity : null;

  return {
    name,
    quantity,
    unit_price: unitPrice && Number.isFinite(unitPrice) ? Number.parseFloat(unitPrice.toFixed(2)) : null,
    line_total: lineTotal,
  };
}

function buildVoiceDraft(transcript: string, detectedTotal: number | null): VoiceDraft {
  const normalized = normalizeTranscriptText(transcript);
  const intent = detectIntent(normalized);
  const customerName = extractCustomerName(normalized);
  const items = splitTranscriptIntoSegments(normalized)
    .map(parseSegment)
    .filter((item): item is ParsedVoiceItem => Boolean(item));

  const itemsTotal = items.length > 0
    ? items.reduce((sum, item) => sum + (item.line_total || 0), 0)
    : null;
  const totalAmount = detectedTotal ?? itemsTotal ?? null;
  const needsReview = !totalAmount || items.length === 0 || intent !== "sale";

  return {
    intent,
    customer_name: customerName,
    items,
    total_amount: totalAmount,
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
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        // ✅ SAFE SERVICE INIT
        let svc;
        try {
          svc = getTranscriptionService();
        } catch (e) {
          console.error("SERVICE INIT ERROR:", e);
          return res.status(500).json({
            error: "Service init failed",
            request_id: res.locals.requestId,
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        // ✅ SAFE TRANSCRIBE
        const transcriptFallback = typeof req.body?.transcript === "string" ? req.body.transcript.trim() : "";
        let transcript = "";
        let confidence: number | null = null;
        let provider: string | null = null;

        try {
          const result = await svc.transcribeAudio(req.file);
          transcript = result.transcript?.trim() || transcriptFallback;
          confidence = result.confidence;
          provider = result.provider || (transcriptFallback ? "browser-transcript" : null);
        } catch (e) {
          console.error("TRANSCRIBE ERROR:", e);
          return res.status(500).json({
            error: "Transcription failed",
            request_id: res.locals.requestId,
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        if (!transcript) {
          return res.status(503).json({
            error: "Transcription provider is not configured",
            request_id: res.locals.requestId,
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        const detected_total = extractLikelyTotal(transcript);
        const draft = buildVoiceDraft(transcript, detected_total);

        return res.json({
          transcript,
          confidence,
          detected_total,
          draft,
          provider,
        });
      }

      // ---------------- TEXT INPUT FLOW ----------------

      const { transcript } = req.body as { transcript?: unknown };

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({
          error: "transcript must be a string",
          ...NULL_TRANSCRIBE_RESPONSE,
        });
      }

      const trimmed = transcript.trim();
      const detected_total = extractLikelyTotal(trimmed);
      const draft = buildVoiceDraft(trimmed, detected_total);

      return res.json({
        transcript: trimmed,
        confidence: draft.needs_review ? 0.55 : 0.85,
        detected_total,
        draft,
        provider: "browser-transcript",
      });

    } catch (e) {
      console.error("FATAL ERROR:", e);
      return res.status(500).json({
        error: "Internal server error",
        request_id: res.locals.requestId,
        ...NULL_TRANSCRIBE_RESPONSE,
      });
    }
  }
);

export default router;
