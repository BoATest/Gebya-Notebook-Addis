import { Router, Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { getTranscriptionService } from "../services/transcriptionService.js";

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

const NULL_RESPONSE = {
  transcript: null,
  confidence: null,
  detected_total: null,
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

        // ✅ SAFE SERVICE INIT
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

        // ✅ SAFE TRANSCRIBE
        let transcript = "";
        let confidence: number | null = null;

        try {
          const result = await svc.transcribeAudio(req.file);
          transcript = result.transcript;
          confidence = result.confidence;
        } catch (e) {
          console.error("TRANSCRIBE ERROR:", e);
          return res.status(500).json({
            error: "Transcription failed",
            request_id: res.locals.requestId,
            ...NULL_RESPONSE,
          });
        }

        const detected_total = extractLikelyTotal(transcript);

        return res.json({
          transcript,
          confidence,
          detected_total,
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
      const detected_total = extractLikelyTotal(trimmed);

      return res.json({
        transcript: trimmed,
        confidence: null,
        detected_total,
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
