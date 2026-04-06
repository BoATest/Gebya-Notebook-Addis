import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  extractLikelyTotal,
  NULL_TRANSCRIBE_RESPONSE,
  parseDraft,
  VoiceContext,
} from '../src/utils/voiceDraft.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', ...NULL_TRANSCRIBE_RESPONSE });
  }

  const contentType = req.headers['content-type'] ?? '';

  if (contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      error: 'multipart/form-data is not supported in this deployment path',
      ...NULL_TRANSCRIBE_RESPONSE,
    });
  }

  let body: Record<string, unknown>;

  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  } catch {
    return res.status(400).json({
      error: 'invalid JSON body',
      ...NULL_TRANSCRIBE_RESPONSE,
    });
  }

  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

  if (!transcript) {
    return res.status(400).json({
      error: 'transcript must be a string',
      ...NULL_TRANSCRIBE_RESPONSE,
    });
  }

  const voiceContext = parseVoiceContext(body.voice_context);
  const draft = parseDraft(transcript, voiceContext);

  return res.status(200).json({
    transcript,
    confidence: draft.needs_review ? 0.55 : 0.85,
    detected_total: draft.total_amount ?? extractLikelyTotal(transcript),
    draft,
    provider: 'browser-transcript',
  });
}
