import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { getTranscriptionService } from '../services/transcriptionService.js';
import {
  buildTranscriptionPrompt,
  extractLikelyTotal,
  NULL_TRANSCRIBE_RESPONSE,
  parseDraft,
  VoiceContext,
} from '../utils/voiceDraft.js';

const router = Router();

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are accepted'));
    }
  },
});

function handleMulterError(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message, ...NULL_TRANSCRIBE_RESPONSE });
    return;
  }
  if (err instanceof Error && err.message === 'Only audio files are accepted') {
    res.status(400).json({ error: err.message, ...NULL_TRANSCRIBE_RESPONSE });
    return;
  }
  next(err);
}

function parseVoiceContext(raw: unknown): VoiceContext | undefined {
  if (!raw) return undefined;

  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object') return undefined;

    const context = value as Record<string, unknown>;
    const toStringArray = (input: unknown) => Array.isArray(input)
      ? input.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];
    const toNumber = (input: unknown): number | null => {
      const value = Number(input);
      return Number.isFinite(value) ? value : null;
    };
    const itemPriceMemory = typeof context.item_price_memory === 'object' && context.item_price_memory
      ? Object.fromEntries(
          Object.entries(context.item_price_memory as Record<string, unknown>).map(([itemName, entry]) => {
            const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
            return [itemName, {
              typical_price: toNumber(item.typical_price),
              recent_prices: Array.isArray(item.recent_prices)
                ? item.recent_prices.map((price) => Number(price)).filter((price) => Number.isFinite(price))
                : [],
              min_price: toNumber(item.min_price),
              max_price: toNumber(item.max_price),
            }];
          }),
        )
      : undefined;
    const customerItemPatterns = typeof context.customer_item_patterns === 'object' && context.customer_item_patterns
      ? Object.fromEntries(
          Object.entries(context.customer_item_patterns as Record<string, unknown>).map(([customerName, items]) => [
            customerName,
            toStringArray(items),
          ]),
        )
      : undefined;

    return {
      business_type: typeof context.business_type === 'string' ? context.business_type.trim() : undefined,
      common_items: toStringArray(context.common_items),
      recent_customers: toStringArray(context.recent_customers),
      payment_providers: toStringArray(context.payment_providers),
      item_price_memory: itemPriceMemory,
      customer_item_patterns: customerItemPatterns,
    };
  } catch {
    return undefined;
  }
}

router.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      upload.single('audio')(req, res, next);
    } else {
      next();
    }
  },
  handleMulterError,
  async (req: MulterRequest, res: Response) => {
    try {
      const contentType = req.headers['content-type'] ?? '';

      if (contentType.includes('multipart/form-data')) {
        if (!req.file) {
          return res.status(400).json({
            error: 'audio file is required',
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        let svc;
        try {
          svc = getTranscriptionService();
        } catch (error) {
          console.error('SERVICE INIT ERROR:', error);
          return res.status(500).json({
            error: 'Service init failed',
            request_id: res.locals.requestId,
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        const transcriptFallback = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
        const voiceContext = parseVoiceContext(req.body?.voice_context);
        let transcript = '';
        let confidence: number | null = null;
        let provider: string | null = null;

        try {
          const result = await svc.transcribeAudio(req.file, {
            prompt: buildTranscriptionPrompt(voiceContext),
          });
          transcript = result.transcript?.trim() || transcriptFallback;
          confidence = result.confidence;
          provider = result.provider || (transcriptFallback ? 'browser-transcript' : null);
        } catch (error) {
          console.error('TRANSCRIBE ERROR:', error);
          return res.status(500).json({
            error: 'Transcription failed',
            request_id: res.locals.requestId,
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        if (!transcript) {
          return res.status(503).json({
            error: 'Transcription provider is not configured',
            request_id: res.locals.requestId,
            ...NULL_TRANSCRIBE_RESPONSE,
          });
        }

        const draft = parseDraft(transcript, voiceContext);

        return res.json({
          transcript,
          confidence,
          detected_total: draft.total_amount ?? extractLikelyTotal(transcript),
          draft,
          provider,
        });
      }

      const { transcript, voice_context: rawVoiceContext } = req.body as { transcript?: unknown; voice_context?: unknown };

      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({
          error: 'transcript must be a string',
          ...NULL_TRANSCRIBE_RESPONSE,
        });
      }

      const trimmed = transcript.trim();
      const voiceContext = parseVoiceContext(rawVoiceContext);
      const draft = parseDraft(trimmed, voiceContext);

      return res.json({
        transcript: trimmed,
        confidence: draft.needs_review ? 0.55 : 0.85,
        detected_total: draft.total_amount ?? extractLikelyTotal(trimmed),
        draft,
        provider: 'browser-transcript',
      });
    } catch (error) {
      console.error('FATAL ERROR:', error);
      return res.status(500).json({
        error: 'Internal server error',
        request_id: res.locals.requestId,
        ...NULL_TRANSCRIBE_RESPONSE,
      });
    }
  },
);

export default router;
