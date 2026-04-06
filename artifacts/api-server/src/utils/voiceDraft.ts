export const NULL_TRANSCRIBE_RESPONSE = {
  transcript: null,
  confidence: null,
  detected_total: null,
  draft: null,
  provider: null,
};

export type ParsedItem = {
  name: string;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
};

export type ParsedDraft = {
  customer_name: string | null;
  items: ParsedItem[];
  total_amount: number | null;
  intent: "sale" | "credit" | "payment";
  needs_review: boolean;
};

export type VoiceContext = {
  business_type?: string | null;
  common_items?: string[];
  recent_customers?: string[];
  payment_providers?: string[];
  item_price_memory?: Record<string, {
    typical_price?: number | null;
    recent_prices?: number[];
    min_price?: number | null;
    max_price?: number | null;
  }>;
  customer_item_patterns?: Record<string, string[]>;
};

export function extractLikelyTotal(transcript: string): number | null {
  const text = transcript.toLowerCase().trim();
  const matches = text.match(/(\d[\d,]*(?:\.\d+)?)/g);

  if (!matches) return null;

  const nums = matches.map((m) => parseFloat(m.replace(/,/g, "")));
  return Math.max(...nums);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLookup(value: string): string {
  return normalizeWhitespace(String(value || "").toLowerCase())
    .replace(/[^a-z0-9\u1200-\u137f\s]/g, "");
}

function normalizeTranscript(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/[፣፤]/g, ", ")
      .replace(/[“”"]/g, " ")
      .replace(/\s*-\s*/g, " "),
  );
}

function getKnownItems(context?: VoiceContext): string[] {
  const directItems = context?.common_items || [];
  const pricedItems = Object.keys(context?.item_price_memory || {});
  return [...new Set([...directItems, ...pricedItems].filter(Boolean))];
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarityScore(a: string, b: string): number {
  const left = normalizeLookup(a);
  const right = normalizeLookup(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.94;

  const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
  const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const tokenScore = overlap / Math.max(leftTokens.size, rightTokens.size, 1);
  const editScore = 1 - (levenshteinDistance(left, right) / Math.max(left.length, right.length, 1));
  return Math.max(tokenScore, editScore);
}

function parseNumber(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
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

function extractCustomerName(text: string, context?: VoiceContext): string | null {
  const patterns = [
    /(?:customer|for)\s+([a-z][a-z\s'-]{1,30})/i,
    /(?:ደንበኛ|ለ)\s+([\u1200-\u137fa-z][\u1200-\u137fa-z\s'-]{1,30})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = normalizeWhitespace(match?.[1] ?? "");
    if (candidate && !/\d/.test(candidate)) return candidate;
  }

  const normalizedText = normalizeLookup(text);
  const contextMatch = (context?.recent_customers || []).find((candidate) => {
    const normalizedCandidate = normalizeLookup(candidate);
    return normalizedCandidate && normalizedText.includes(normalizedCandidate);
  });

  if (contextMatch) return normalizeWhitespace(contextMatch);

  const fuzzyCustomer = (context?.recent_customers || [])
    .map((candidate) => ({
      candidate,
      score: similarityScore(text, candidate),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (fuzzyCustomer && fuzzyCustomer.score >= 0.8) {
    return normalizeWhitespace(fuzzyCustomer.candidate);
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
      .replace(/[,+]/g, " "),
  );
}

function cleanItemName(segment: string): string {
  return normalizeWhitespace(
    stripContextWords(segment)
      .replace(/\b(and|plus|then)\b/gi, " ")
      .replace(/\b(እና|ከዚያ)\b/g, " "),
  );
}

function splitSegments(text: string): string[] {
  return normalizeTranscript(text)
    .split(/\s*(?:,| and | እና | plus | then )\s*/i)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
}

function resolveKnownItemName(segment: string, fallbackName: string, context?: VoiceContext): string {
  const normalizedSegment = normalizeLookup(segment);
  const knownItems = getKnownItems(context);
  const contextMatch = knownItems.find((candidate) => {
    const normalizedCandidate = normalizeLookup(candidate);
    return normalizedCandidate && normalizedSegment.includes(normalizedCandidate);
  });

  if (contextMatch) return normalizeWhitespace(contextMatch);

  const fuzzyItem = knownItems
    .map((candidate) => ({
      candidate,
      score: similarityScore(fallbackName, candidate),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (fuzzyItem && fuzzyItem.score >= 0.78) {
    return normalizeWhitespace(fuzzyItem.candidate);
  }

  return fallbackName;
}

function getItemPriceMemory(itemName: string, context?: VoiceContext) {
  const knownEntries = Object.entries(context?.item_price_memory || {});
  const directMatch = knownEntries.find(([candidate]) => normalizeLookup(candidate) === normalizeLookup(itemName));
  if (directMatch) return directMatch[1];

  const fuzzyMatch = knownEntries
    .map(([candidate, memory]) => ({
      memory,
      score: similarityScore(itemName, candidate),
    }))
    .sort((a, b) => b.score - a.score)[0];

  return fuzzyMatch && fuzzyMatch.score >= 0.78 ? fuzzyMatch.memory : null;
}

function inferItemFromCustomerPattern(customerName: string | null, totalAmount: number | null, context?: VoiceContext): ParsedItem | null {
  if (!customerName) return null;

  const patternEntries = Object.entries(context?.customer_item_patterns || {});
  const customerMatch = patternEntries
    .map(([candidate, items]) => ({
      items,
      score: similarityScore(customerName, candidate),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (!customerMatch || customerMatch.score < 0.8 || !customerMatch.items?.length) {
    return null;
  }

  const name = customerMatch.items[0];
  const priceMemory = getItemPriceMemory(name, context);
  const typicalPrice = priceMemory?.typical_price != null ? roundMoney(priceMemory.typical_price) : null;
  const lineTotal = totalAmount ?? typicalPrice ?? null;

  return {
    name,
    quantity: 1,
    unit_price: lineTotal,
    line_total: lineTotal,
  };
}

function parseSegment(segment: string, context?: VoiceContext): { item: ParsedItem | null; uncertain: boolean } {
  const normalized = normalizeWhitespace(segment);
  const baseName = cleanItemName(normalized);
  const name = baseName ? resolveKnownItemName(normalized, baseName, context) : baseName;
  const priceMemory = name ? getItemPriceMemory(name, context) : null;
  const typicalPrice = priceMemory?.typical_price != null ? roundMoney(priceMemory.typical_price) : null;
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
      item: { name, quantity: 1, unit_price: null, line_total: null },
      uncertain: true,
    };
  }

  const hasQuantityCue = /\b(qty|quantity|x|pcs?|pieces?)\b|ቁጥር|እቃ/i.test(normalized);
  const hasPriceCue = /\b(price|birr|br|at|for)\b|ብር|ዋጋ|በ/i.test(normalized);

  if (numbers.length === 1) {
    const [first] = numbers;
    const startsWithNumber = first.index <= 1;
    const looksLikeQuantity = first.value <= 10 && typicalPrice != null && first.value < typicalPrice && !hasPriceCue;
    const quantity = looksLikeQuantity
      ? first.value
      : (startsWithNumber && !hasPriceCue ? first.value : (hasQuantityCue && !hasPriceCue ? first.value : 1));
    const unitPrice = looksLikeQuantity
      ? typicalPrice
      : (quantity === first.value ? typicalPrice : first.value);

    return {
      item: {
        name,
        quantity,
        unit_price: unitPrice,
        line_total: unitPrice != null ? roundMoney((quantity || 1) * unitPrice) : null,
      },
      uncertain: unitPrice == null || looksLikeQuantity,
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
    uncertain: false,
  };
}

function detectProviderHints(text: string, context?: VoiceContext): boolean {
  const normalizedText = normalizeLookup(text);
  const knownProviders = context?.payment_providers || [];
  return knownProviders.some((provider) => {
    const normalizedProvider = normalizeLookup(provider);
    return normalizedProvider && normalizedText.includes(normalizedProvider);
  });
}

function extractExplicitTotal(text: string): number | null {
  const match = text.match(/(?:total|sum|amount|ጠቅላላ)\s*(?:is)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  return match ? parseNumber(match[1]) : null;
}

export function buildTranscriptionPrompt(context?: VoiceContext): string {
  const parts = [
    "Amharic and English mixed retail speech.",
  ];

  if (context?.business_type) {
    parts.push(`Business type: ${context.business_type}.`);
  }
  if (context?.common_items?.length) {
    parts.push(`Common items: ${context.common_items.slice(0, 12).join(", ")}.`);
  }
  if (context?.recent_customers?.length) {
    parts.push(`Recent customers: ${context.recent_customers.slice(0, 10).join(", ")}.`);
  }
  if (context?.payment_providers?.length) {
    parts.push(`Common payment providers: ${context.payment_providers.slice(0, 8).join(", ")}.`);
  }
  if (context?.customer_item_patterns && Object.keys(context.customer_item_patterns).length > 0) {
    const summaries = Object.entries(context.customer_item_patterns)
      .slice(0, 5)
      .map(([customer, items]) => `${customer}: ${items.slice(0, 2).join(", ")}`);
    if (summaries.length) {
      parts.push(`Frequent customer-item patterns: ${summaries.join(" | ")}.`);
    }
  }

  return parts.join(" ");
}

export function parseDraft(transcript: string, context?: VoiceContext): ParsedDraft {
  const normalized = normalizeTranscript(transcript);
  const intent = detectIntent(normalized);
  const customerName = extractCustomerName(normalized, context);
  const segments = splitSegments(normalized);
  const parsedSegments = segments.map((segment) => parseSegment(segment, context));
  const items = parsedSegments
    .map((entry) => entry.item)
    .filter((entry): entry is ParsedItem => Boolean(entry && entry.name));

  const explicitTotal = extractExplicitTotal(normalized);
  const calculableTotal = items.length > 0 && items.every((item) => item.line_total != null)
    ? roundMoney(items.reduce((sum, item) => sum + (item.line_total || 0), 0))
    : null;
  const totalAmount = explicitTotal ?? calculableTotal ?? extractLikelyTotal(normalized);
  const recoveredItems = items.length === 0
    ? (inferItemFromCustomerPattern(customerName, totalAmount, context) ? [inferItemFromCustomerPattern(customerName, totalAmount, context)!] : [])
    : items;
  const uncertainItems = parsedSegments.some((entry) => entry.uncertain);
  const providerHintSeen = detectProviderHints(normalized, context);
  const needsReview = intent !== "sale"
    || recoveredItems.length === 0
    || uncertainItems
    || recoveredItems !== items
    || (explicitTotal != null && calculableTotal != null && Math.abs(explicitTotal - calculableTotal) > 0.01)
    || (providerHintSeen && totalAmount == null);

  return {
    customer_name: customerName,
    items: recoveredItems,
    total_amount: totalAmount,
    intent,
    needs_review: needsReview,
  };
}
