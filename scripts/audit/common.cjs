'use strict';
/**
 * audit/common.cjs — shared constants and low-level parsing for the bilingual
 * string audit. No side effects: import and call.
 */
const fs = require('fs');
const path = require('path');

const SRC = 'artifacts/gebya/src';
const ETHIOPIC = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;

/** Objectively broken bytes. Owner instruction: do NOT guess readings. */
const BROKEN_TOKENS = [
  { token: 'መዲዛ', note: 'Not an Amharic word. Appears in the password surface.' },
  { token: 'መዲወ', note: 'Not an Amharic word. Appears in the login prompt.' },
  { token: 'አስudya', note: 'Latin letters inside an Amharic string.' },
  { token: 'መስከቨሪ', note: 'Not an Amharic word (password length error text).' },
  { token: 'የይምት', note: 'Insult used for "password". Mostly fixed; remnants remain.' },
  { token: 'ከይምት', note: 'Insult remnant of የይምት.' },
  { token: 'ጌብያ', note: 'Brand misspelling of ገበያ.' },
];

/**
 * Repeating-token corruption: the SAME Ethiopic word appears 2+ times in a row.
 * Real hit: AuthRequiredPrompt.jsx:34 'ሙያዊ ሙያዊ ሙያዊ' ("Too many attempts").
 *
 * Implemented by comparing whitespace-separated tokens rather than a regex with
 * `\b` — JS `\b` is defined against `\w` ([A-Za-z0-9_]) and Ethiopic syllables
 * are not `\w`, so a word-boundary regex silently never matches.
 */
const ETHIOPIC_WORD = /^[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]+$/;

function repeatedToken(am) {
  if (!am) return null;
  const tokens = am.split(/\s+/).filter(Boolean);
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (ETHIOPIC_WORD.test(tokens[i]) && tokens[i] === tokens[i + 1]) {
      return tokens[i];
    }
  }
  return null;
}

const CENTRAL = {
  dict: 'artifacts/gebya/src/context/dictionaries.js',
  grouped: 'artifacts/gebya/src/components/settings/groupedLabels.js',
  onboarding: 'artifacts/gebya/src/labels/onboarding.js',
  settings: 'artifacts/gebya/src/labels/settings.js',
  shared: 'artifacts/gebya/src/labels/shared.js',
  transactions: 'artifacts/gebya/src/labels/transactions.js',
};
const CENTRAL_FILES = new Set(Object.values(CENTRAL));
const LABEL_FILES = new Set([CENTRAL.onboarding, CENTRAL.settings, CENTRAL.shared, CENTRAL.transactions]);

const SCREEN_RULES = [
  [/dictionaries\.js$/, 'Context dictionaries (global)'],
  [/labels\/onboarding/, 'Onboarding — labels'],
  [/labels\/settings/, 'Settings — labels'],
  [/labels\/transactions/, 'Transactions — labels'],
  [/labels\/shared/, 'Shared labels'],
  [/groupedLabels/, 'Settings — grouped draft'],
  [/AuthRequiredPrompt|PasswordSettings|AuthGate|OnboardingScreen|JoinPage|PayPage|LoginPage|Owners?Login/, 'Auth & onboarding'],
  [/AdminShopDetail|OwnerActivityDashboard|Admin/, 'Admin'],
  [/CustomerDetail|CustomerForm|CustomerTransactionSheet|CustomerLedger|ActivityPanel/, 'Customers'],
  [/Supplier/i, 'Suppliers'],
  [/TransactionForm/, 'Transactions — form'],
  [/Settlement/i, 'Settlements'],
  [/ReportView|shopStory|Analytics/i, 'Reports & story'],
  [/Staff/i, 'Staff'],
  [/Settings|settings\//, 'Settings'],
  [/shell\/|TopBar|Nav|PwaInstall|UpdateBanner|Offline|Toaster|Header/i, 'App shell'],
  [/utils\/|store/i, 'Utils & stores'],
];

function screenFor(file) {
  for (const [re, label] of SCREEN_RULES) if (re.test(file)) return label;
  return 'Other';
}

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(name)) out.push(...walk(full));
    } else if (/\.(jsx?|tsx?)$/.test(name)) {
      out.push(full.replace(/\\/g, '/'));
    }
  }
  return out;
}

/** Decode a JS string-literal body (handles \u{...}, \uXXXX, escapes). */
function decodeLiteral(body) {
  return body
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\n/g, ' ').replace(/\\t/g, ' ')
    .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, '`')
    .replace(/\\\\/g, '\\');
}

/** Escape pipes so a value can live in a markdown table cell. */
function cell(v) {
  if (v === null || v === undefined) return '—';
  return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || '—';
}

/**
 * Blank out comments while preserving column positions, so a token mentioned
 * only in a `//` note is not mistaken for shipped copy.
 *
 * String-literal aware: a `//` inside a quoted string (a URL, say) is content,
 * not a comment. Returns a same-length string with comment characters replaced
 * by spaces, so character offsets from the original line still line up.
 *
 * Accepts a single line OR a whole file. Line comments stop at the newline —
 * without that, a `//` in a file-sized input would blank out every byte after
 * it, silently deleting most of the module.
 */
function stripComments(text) {
  let out = '';
  let i = 0;
  let quote = null; // active string delimiter
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (quote) {
      if (c === '\\') { out += text.slice(i, i + 2); i += 2; continue; }
      if (c === quote) { quote = null; out += c; i++; continue; }
      out += c; i++; continue;
    }

    if (c === "'" || c === '"' || c === '`') { quote = c; out += c; i++; continue; }

    if (c === '/' && next === '/') {
      // Blank to end of LINE, keeping the newline itself.
      while (i < text.length && text[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && next === '*') {
      out += '  '; i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        // Preserve newlines so line numbering downstream stays correct.
        out += text[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < text.length) { out += '  '; i += 2; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** Is this Amharic string built from broken/insult/non-word tokens? */
function brokenReason(am) {
  if (!am || !ETHIOPIC.test(am)) return null;
  for (const b of BROKEN_TOKENS) {
    if (am.includes(b.token)) return b;
  }
  const rep = repeatedToken(am);
  if (rep) {
    return { token: `«${rep}» repeated`, note: 'The same word repeats back-to-back — byte corruption.' };
  }
  return null;
}

module.exports = {
  SRC, ETHIOPIC, BROKEN_TOKENS, repeatedToken, ETHIOPIC_WORD, stripComments,
  CENTRAL, CENTRAL_FILES, LABEL_FILES,
  screenFor, walk, decodeLiteral, cell, brokenReason,
};
