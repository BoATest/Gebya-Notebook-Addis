export type VoiceIntent = "sale" | "credit" | "payment" | "unknown";

export type ParsedItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  line_total: number | null;
};

export type ParsedAnalysis = {
  intent: VoiceIntent;
  customer: string | null;
  items: ParsedItem[];
  total: number | null;
  currency: "ETB";
  needs_review: boolean;
  issues: string[];
};

const AMHARIC_ONES: Record<string, number> = {
  "ዜሮ": 0,
  "አንድ": 1,
  "አንዴ": 1,
  "አንዱ": 1,
  "ሀንድ": 1,
  "ሁለት": 2,
  "ሁለቴ": 2,
  "ሁለቱ": 2,
  "ሶስት": 3,
  "ሶስቴ": 3,
  "ሶስቱ": 3,
  "ሦስት": 3,
  "አራት": 4,
  "አራቱ": 4,
  "አምስት": 5,
  "አምስቱ": 5,
  "ስድስት": 6,
  "ስድስቱ": 6,
  "ሰባት": 7,
  "ሰባቱ": 7,
  "ስምንት": 8,
  "ስምንቱ": 8,
  "ዘጠኝ": 9,
  "ዘጠኙ": 9,
};

const AMHARIC_TEENS: Record<string, number> = {
  "አስራአንድ": 11,
  "አስራአንዱ": 11,
  "አስራሁለት": 12,
  "አስራሁለቱ": 12,
  "አስራሶስት": 13,
  "አስራሦስት": 13,
  "አስራአራት": 14,
  "አስራአምስት": 15,
  "አስራስድስት": 16,
  "አስራሰባት": 17,
  "አስራስምንት": 18,
  "አስራዘጠኝ": 19,
};

const AMHARIC_TENS: Record<string, number> = {
  "አስር": 10,
  "አስራ": 10,
  "ሃያ": 20,
  "ሀያ": 20,
  "ሰላሳ": 30,
  "አርባ": 40,
  "አርባው": 40,
  "ሃምሳ": 50,
  "ሀምሳ": 50,
  "ስልሳ": 60,
  "ሰባ": 70,
  "ሰባው": 70,
  "ሰማንያ": 80,
  "ዘጠና": 90,
};

const AMHARIC_HUNDREDS = new Set(["መቶ"]);
const AMHARIC_THOUSANDS = new Set(["ሺ", "ሽ"]);

const UNIT_WORDS = [
  "ኪሎ",
  "ኪ.ግ",
  "kg",
  "kilo",
  "pack",
  "packet",
  "pcs",
  "piece",
  "litre",
  "liter",
  "ሊትር",
  "ጠርሙስ",
];

const CREDIT_WORDS = ["credit", "dubie", "ዱቤ", "በዱቤ", "later", "merro", "መሮ", "ዕዳ", "ብድር"];
const PAYMENT_WORDS = ["payment", "paid", "pay", "ከፈለ", "ክፍያ", "መለሰ"];
const PRICE_CUE_WORDS = ["each", "per", "አንዱ", "በኪሎ", "for each", "per kilo"];
const CURRENCY_WORDS = ["birr", "br", "etb", "ብር"];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function roundMoney(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function tokenize(value: string): string[] {
  return normalizeWhitespace(
    value
      .replace(/[፣፤,]/g, " , ")
      .replace(/[“”"]/g, " ")
      .replace(/\//g, " / ")
      .replace(/\s*-\s*/g, " ")
  ).split(" ").filter(Boolean);
}

function isKnownNumberToken(token: string): boolean {
  return Boolean(
    AMHARIC_ONES[token]
    || AMHARIC_TEENS[token]
    || AMHARIC_TENS[token]
    || AMHARIC_HUNDREDS.has(token)
    || AMHARIC_THOUSANDS.has(token)
  );
}

function parseAmharicNumberTokens(tokens: string[], startIndex: number): { value: number | null; length: number } {
  let index = startIndex;
  let consumed = 0;
  let total = 0;
  let groupValue = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    const next = tokens[index + 1];

    if (AMHARIC_TEENS[token]) {
      groupValue += AMHARIC_TEENS[token];
      index += 1;
      consumed += 1;
      continue;
    }

    if (AMHARIC_ONES[token] && next && AMHARIC_HUNDREDS.has(next)) {
      groupValue += AMHARIC_ONES[token] * 100;
      index += 2;
      consumed += 2;
      continue;
    }

    if (AMHARIC_HUNDREDS.has(token)) {
      groupValue += 100;
      index += 1;
      consumed += 1;
      continue;
    }

    if (AMHARIC_TENS[token]) {
      groupValue += AMHARIC_TENS[token];
      index += 1;
      consumed += 1;
      continue;
    }

    if (AMHARIC_ONES[token]) {
      groupValue += AMHARIC_ONES[token];
      index += 1;
      consumed += 1;
      continue;
    }

    if (AMHARIC_THOUSANDS.has(token)) {
      total += (groupValue || 1) * 1000;
      groupValue = 0;
      index += 1;
      consumed += 1;
      continue;
    }

    break;
  }

  if (!consumed) {
    return { value: null, length: 0 };
  }

  return {
    value: total + groupValue,
    length: consumed,
  };
}

export function normalizeAmharicNumbers(input: string): string {
  const tokens = tokenize(input);
  const normalized: string[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!isKnownNumberToken(token)) {
      normalized.push(token);
      continue;
    }

    const parsed = parseAmharicNumberTokens(tokens, index);
    if (parsed.length > 0 && parsed.value != null) {
      normalized.push(String(parsed.value));
      index += parsed.length - 1;
      continue;
    }

    normalized.push(token);
  }

  return normalizeWhitespace(normalized.join(" "));
}

function normalizeTranscript(value: string): string {
  return normalizeWhitespace(
    normalizeAmharicNumbers(
      value
        .toLowerCase()
        .replace(/[፣፤]/g, ", ")
        .replace(/[“”"]/g, " ")
    )
  );
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/,/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectIntent(text: string): VoiceIntent {
  if (PAYMENT_WORDS.some((word) => text.includes(word.toLowerCase()))) return "payment";
  if (CREDIT_WORDS.some((word) => text.includes(word.toLowerCase()))) return "credit";
  return "sale";
}

function extractCustomer(text: string): { customer: string | null; issue: string | null } {
  const patterns = [
    /(?:customer|for|ደንበኛ|ለ)\s+([\u1200-\u137fa-z][\u1200-\u137fa-z0-9\s'-]{1,30})/i,
    /^([\u1200-\u137fa-z][\u1200-\u137fa-z0-9\s'-]{1,20})\s+(?:,|\/)?\s*.+$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const customer = normalizeWhitespace(match?.[1] ?? "");
    if (!customer) continue;
    if (/\d/.test(customer)) continue;
    const lower = customer.toLowerCase();
    if (UNIT_WORDS.includes(lower) || CREDIT_WORDS.includes(lower) || PAYMENT_WORDS.includes(lower)) continue;
    return { customer, issue: null };
  }

  return { customer: null, issue: "missing_customer" };
}

function splitItemChunks(text: string): string[] {
  return normalizeWhitespace(text)
    .split(/\s*(?:,| and | እና | plus | then )\s*/i)
    .map((chunk) => normalizeWhitespace(chunk))
    .filter(Boolean);
}

function hasExplicitUnitPriceCue(chunk: string): boolean {
  const lower = chunk.toLowerCase();
  return PRICE_CUE_WORDS.some((cue) => lower.includes(cue.toLowerCase()));
}

function extractUnit(chunk: string): string | null {
  const lower = chunk.toLowerCase();
  return UNIT_WORDS.find((unit) => lower.includes(unit.toLowerCase())) ?? null;
}

function extractNumbers(chunk: string): number[] {
  return [...chunk.matchAll(/\d[\d,]*(?:\.\d+)?/g)]
    .map((match) => parseNumber(match[0]))
    .filter((value): value is number => value != null);
}

function extractQuantity(chunk: string): number | null {
  const lower = chunk.toLowerCase();
  const unit = extractUnit(lower);
  const numbers = extractNumbers(lower);

  if (unit && numbers.length > 0) {
    return numbers[0];
  }

  if (numbers.length > 1) {
    return numbers[0];
  }

  return 1;
}

function cleanItemName(chunk: string, customer: string | null): string {
  let cleaned = ` ${chunk.toLowerCase()} `;

  if (customer) {
    cleaned = cleaned.replace(new RegExp(`\\b${customer.toLowerCase()}\\b`, "g"), " ");
  }

  for (const unit of UNIT_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${unit}\\b`, "g"), " ");
  }

  for (const word of [...PRICE_CUE_WORDS, ...CREDIT_WORDS, ...PAYMENT_WORDS, ...CURRENCY_WORDS, "customer", "for", "ደንበኛ", "ለ"]) {
    cleaned = cleaned.replace(new RegExp(`\\b${word.toLowerCase()}\\b`, "g"), " ");
  }

  cleaned = cleaned.replace(/\d[\d,]*(?:\.\d+)?/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function parseItemChunk(chunk: string, customer: string | null): { item: ParsedItem | null; issues: string[] } {
  const numbers = extractNumbers(chunk);
  const quantity = extractQuantity(chunk);
  const unit = extractUnit(chunk);
  const hasUnitPriceCue = hasExplicitUnitPriceCue(chunk);
  const name = cleanItemName(chunk, customer);
  const issues: string[] = [];

  if (!name) {
    issues.push("missing_item_name");
    return { item: null, issues };
  }

  if (numbers.length === 0) {
    issues.push("missing_price");
    return {
      item: {
        name,
        quantity,
        unit,
        unit_price: null,
        line_total: null,
      },
      issues,
    };
  }

  const lastNumber = numbers[numbers.length - 1];
  let lineTotal: number | null = lastNumber;
  let unitPrice: number | null = null;

  if (hasUnitPriceCue) {
    unitPrice = lastNumber;
    lineTotal = roundMoney((quantity || 1) * unitPrice);
  } else if ((quantity || 1) > 1) {
    lineTotal = lastNumber;
    unitPrice = roundMoney(lastNumber / (quantity || 1));
  } else {
    unitPrice = lastNumber;
    lineTotal = lastNumber;
  }

  return {
    item: {
      name,
      quantity,
      unit,
      unit_price: unitPrice,
      line_total: lineTotal,
    },
    issues,
  };
}

function extractExplicitTotal(text: string): number | null {
  const match = text.match(/(?:total|sum|amount|ጠቅላላ)\s*(?:is)?\s*(\d[\d,]*(?:\.\d+)?)/i);
  return match ? parseNumber(match[1]) : null;
}

export function analyzeTranscript(rawTranscript: string): {
  raw_transcript: string;
  normalized_transcript: string;
  parsed: ParsedAnalysis;
} {
  const rawTranscriptTrimmed = normalizeWhitespace(rawTranscript);
  const transcript = normalizeTranscript(rawTranscriptTrimmed);
  const issues = new Set<string>();
  const intent = detectIntent(transcript);
  const { customer, issue: customerIssue } = extractCustomer(transcript);
  if (customerIssue && intent === "sale") issues.add(customerIssue);

  const chunks = splitItemChunks(transcript);
  const items: ParsedItem[] = [];

  for (const chunk of chunks) {
    const { item, issues: itemIssues } = parseItemChunk(chunk, customer);
    itemIssues.forEach((issue) => issues.add(issue));
    if (item) items.push(item);
  }

  if (!items.length) issues.add("missing_items");

  const explicitTotal = extractExplicitTotal(transcript);
  const summedTotal = items.length ? roundMoney(items.reduce((sum, item) => sum + (item.line_total || 0), 0)) : null;
  const total = explicitTotal ?? summedTotal;

  if (explicitTotal == null && summedTotal == null) issues.add("missing_total");
  if (explicitTotal != null && summedTotal != null && Math.abs(explicitTotal - summedTotal) > 0.01) {
    issues.add("explicit_total_mismatch");
  }
  if (intent === "credit") issues.add("credit_detected");
  if (intent === "payment") issues.add("payment_detected");

  return {
    raw_transcript: rawTranscriptTrimmed,
    normalized_transcript: transcript,
    parsed: {
      intent,
      customer,
      items,
      total,
      currency: "ETB",
      needs_review: issues.size > 0,
      issues: [...issues],
    },
  };
}
