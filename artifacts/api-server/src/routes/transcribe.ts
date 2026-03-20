import { Router } from "express";

const router = Router();

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

function extractNumber(transcript: string): number | null {
  const text = transcript.toLowerCase().trim();

  // Try Arabic numerals first (with optional comma separators)
  const arabicMatch = text.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (arabicMatch) {
    const num = parseFloat(arabicMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) return num;
  }

  // Try multi-word Amharic amounts (longest match first)
  const amharicKeys = Object.keys(AMHARIC_WORDS)
    .filter(k => AMHARIC_WORDS[k] > 0)
    .sort((a, b) => b.length - a.length);

  for (const key of amharicKeys) {
    if (transcript.includes(key)) {
      return AMHARIC_WORDS[key];
    }
  }

  // Try English word-based number extraction
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

router.post("/transcribe", (req, res) => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "transcript is required and must be a string" });
  }

  const trimmed = transcript.trim();
  const detected_total = extractNumber(trimmed);

  return res.json({ transcript: trimmed, detected_total });
});

export default router;
