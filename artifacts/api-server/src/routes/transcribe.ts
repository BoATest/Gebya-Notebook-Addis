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

const NULL_RESPONSE = { transcript: null, confidence: null, detected_total: null };

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

const AMHARIC_WORDS: Record<string, number> = {
  "አንድ": 1, "ሁለት": 2, "ሦስት": 3, "ሶስት": 3, "አራት": 4, "አምስት": 5,
  "ስድስት": 6, "ሰባት": 7, "ስምንት": 8, "ዘጠኝ": 9, "አስር": 10,
  "አስራ": 10, "አስራ አንድ": 11, "አስራ ሁለት": 12, "አስራ ሦስት": 13,
  "ሀምሳ": 50, "ሃምሳ": 50, "ሰላሳ": 30, "አርባ": 40, "ስልሳ": 60,
  "ሰባ": 70, "ሰማንያ": 80, "ዘጠና": 90,
  "መቶ": 100, "ሁለት መቶ": 200, "ሦስት መቶ": 300, "አምስት መቶ": 500,
  "ሺ": 1000, "ሺህ": 1000, "አንድ ሺ": 1000, "ሁለት ሺ": 2000,
  "አምስት ሺ": 5000, "አስር ሺ": 10000,
  "ብር": 0, "birr": 0,
};

const ENGLISH_WORDS: Record<string, number> = {
  "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
  "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
  "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
  "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
  "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
  "hundred": 100, "thousand": 1000,
};

function extractEnglishWordNumber(text: string): number | null {
  let total = 0;
  let current = 0;
  let found = false;

  const words = text.split(/[\s,]+/);
  for (const word of words) {
    if (word in ENGLISH_WORDS) {
      const val = ENGLISH_WORDS[word];
      found = true;
      if (val === 100) {
        current = current === 0 ? 100 : current * 100;
      } else if (val === 1000) {
        current = current === 0 ? 1000 : current * 1000;
        total += current;
        current = 0;
      } else {
        current += val;
      }
    }
  }

  if (found) {
    const result = total + current;
    if (result > 0) return result;
  }

  return null;
}

export function extractLikelyTotal(transcript: string): number | null {
  const text = transcript.toLowerCase().trim();
  const candidates: number[] = [];

  // Collect all Arabic numerals from the transcript
  const arabicMatches = text.matchAll(/(\d[\d,]*(?:\.\d+)?)/g);
  for (const match of arabicMatches) {
    const num = parseFloat(match[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) {
      candidates.push(num);
    }
  }

  // If we found Arabic numerals, return the largest one
  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  // Try multi-word Amharic amounts (longest match first)
  const amharicKeys = Object.keys(AMHARIC_WORDS)
    .filter(k => AMHARIC_WORDS[k] > 0)
    .sort((a, b) => b.length - a.length);

  const amharicCandidates: number[] = [];
  for (const key of amharicKeys) {
    if (transcript.includes(key)) {
      amharicCandidates.push(AMHARIC_WORDS[key]);
    }
  }

  if (amharicCandidates.length > 0) {
    return Math.max(...amharicCandidates);
  }

  // Try English word-based number extraction
  const wordNum = extractEnglishWordNumber(text);
  if (wordNum !== null) return wordNum;

  return null;
}

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

      if (contentType.includes("multipart/form-data")) {
        if (!req.file) {
          res.status(400).json({
            error: "audio file is required when using multipart upload",
            ...NULL_RESPONSE,
          });
          return;
        }

        const svc = getTranscriptionService();
        let transcript = "";
        let confidence: number | null = null;

        try {
          const result = await svc.transcribeAudio(req.file);
          transcript = result.transcript;
          confidence = result.confidence;
        } catch {
          res.status(500).json({
            error: "Transcription service failed",
            ...NULL_RESPONSE,
          });
          return;
        }

        const detected_total = extractLikelyTotal(transcript);
        res.json({ transcript, confidence, detected_total });
        return;
      }

      const { transcript } = req.body as { transcript?: unknown };

      if (!transcript || typeof transcript !== "string") {
        res.status(400).json({
          error: "transcript is required and must be a string",
          ...NULL_RESPONSE,
        });
        return;
      }

      const trimmed = transcript.trim();
      const detected_total = extractLikelyTotal(trimmed);

      res.json({
        transcript: trimmed,
        confidence: null,
        detected_total,
      });
    } catch {
      res.status(500).json({
        error: "Internal server error",
        ...NULL_RESPONSE,
      });
    }
  }
);

export default router;
