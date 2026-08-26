import { type Request } from "express";
import { type TelegramLinkSession } from "../services/telegramStore.js";
import { getTelegramBotUsername } from "../services/telegramBotService.js";

export type Lang = "am" | "en";

function getPublicApiBase(req: Request) {
  const configured = process.env.GEBYA_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.headers.host;
  return host ? `${proto}://${host}` : "";
}

function createDeepLink(token: string) {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) return null;
  // Strip any leading '@' — TELEGRAM_BOT_USERNAME may be set as '@shopnotebookbot'
  // but a t.me URL must not contain '@' or it won't open the bot.
  const handle = botUsername.replace(/^@+/, "");
  return `https://t.me/${handle}?start=${encodeURIComponent(token)}`;
}

// V1: English-only rollout. Language detection from message.from.language_code
// is already correctly implemented but we default to English until Amharic is
// re-enabled with proper persistence (telegram_language_code column).
function pickLang(_code?: string | null): Lang {
  return "en";
}

function buildStartReply(
  session: TelegramLinkSession | null,
  existingSession: TelegramLinkSession | null,
  hadToken: boolean,
  lang: Lang,
) {
  // Case A — they came from a fresh shop-generated link and got linked
  if (session && hadToken) {
    if (lang === "am") {
      return [
        `🏪 ${session.shopName}`,
        "",
        `✓ ተገናኝተዋል! እንደ ${session.customerName} ተመዝግበዋል።`,
        "የቀሪ ሂሳብ ማስታወሻዎችን እና አስታዋሾችን እዚህ እልክልዎታለሁ።",
        "",
        "የቀሪ ሂሳብዎን ለመፈተሽ /balance ይተይቡ።",
        "ሌላ ምን ማድረግ እንደምችል ለማየት /help ይተይቡ።",
      ].join("\n");
    }
    return [
      `🏪 ${session.shopName}`,
      "",
      `✓ Linked! You're connected as ${session.customerName}.`,
      "I'll send you balance updates and reminders here.",
      "",
      "Type /balance any time to check your latest balance.",
      "Type /help to see what else I can do.",
    ].join("\n");
  }

  // Case B — they typed /start with an invalid/expired token
  if (hadToken && !session) {
    if (lang === "am") {
      return [
        "ጌባያ",
        "",
        "ይህ አገናኝ ጊዜው አልፎበታል።",
        "ከሱቅ ባለቤትዎ አዲስ የቴሌግራም አገናኝ ይጠይቁ።",
        "",
        "ተጨማሪ መረጃ ከፈለጉ /help ይተይቡ።",
      ].join("\n");
    }
    return [
      "Gebya",
      "",
      "That link is no longer valid.",
      "Ask your shop owner to share a fresh Telegram link.",
      "",
      "Type /help if you need more info.",
    ].join("\n");
  }

  // Case C — they're already linked from a previous /start
  if (existingSession) {
    if (lang === "am") {
      return [
        `🏪 ${existingSession.shopName}`,
        "",
        `👋 በደህና ተመለሱ፣ ${existingSession.customerName}።`,
        "አሁንም ተገናኝተዋል። ማስታወሻዎችን ማላክን እቀጥላለሁ።",
        "",
        "የቀሪ ሂሳብዎን ለመፈተሽ /balance ይተይቡ።",
        "ሌላ ምን ማድረግ እንደምችል ለማየት /help ይተይቡ።",
      ].join("\n");
    }
    return [
      `🏪 ${existingSession.shopName}`,
      "",
      `👋 Welcome back, ${existingSession.customerName}.`,
      "You're still linked. I'll keep sending you updates.",
      "",
      "Type /balance to check your latest balance.",
      "Type /help to see what else I can do.",
    ].join("\n");
  }

  // Case D — plain /start with no token and no prior link → friendly intro
  if (lang === "am") {
    return [
      "👋 ወደ ጌባያ እንኳን ደህና መጡ!",
      "",
      "እኔ የሱቅ ረዳት ቦት ነኝ። የሱቅ ባለቤቶች የደንበኞቻቸውን ዱቤ",
      "(ብድር) ለመከታተል ጌባያን ይጠቀማሉ — እኔ የቀሪ ሂሳብ",
      "ማስታወሻዎችን እና ወዳጃዊ አስታዋሾችን እንዲልኩልዎ እረዳቸዋለሁ።",
      "",
      "ማስታወሻዎችን መቀበል ለመጀመር፣ የጌባያ አገናኛቸውን",
      "እንዲያጋሩልዎ ከሱቅ ባለቤትዎ ይጠይቁ።",
      "",
      "ተጨማሪ ለማወቅ /help ይተይቡ።",
    ].join("\n");
  }
  return [
    "👋 Welcome to Gebya!",
    "",
    "I'm a shop assistant bot. Shop owners use Gebya to track dubie",
    "(credit) for their customers — I help them send you balance",
    "updates and friendly reminders.",
    "",
    "To start receiving updates, ask your shop owner to share their",
    "Gebya link with you. When you tap it, I'll connect you to their shop.",
    "",
    "Type /help to learn more.",
  ].join("\n");
}

function buildBalanceReply(
  session: TelegramLinkSession | null,
  lang: Lang,
) {
  if (!session) {
    if (lang === "am") {
      return [
        "ጌባያ",
        "",
        "ገና ከሱቅ ጋር አልተገናኙም።",
        "የጌባያ አገናኛቸውን እንዲያጋሩልዎ ከሱቅ ባለቤትዎ ይጠይቁ።",
        "",
        "ተጨማሪ መረጃ ለማግኘት /help ይተይቡ።",
      ].join("\n");
    }
    return [
      "Gebya",
      "",
      "You're not linked to a shop yet.",
      "Ask your shop owner to share their Gebya link with you.",
      "",
      "Type /help for more info.",
    ].join("\n");
  }

  if (lang === "am") {
    return [
      `🏪 ${session.shopName}`,
      "",
      `👤 ${session.customerName}`,
      `💰 የአሁኑ ቀሪ ሂሳብ: ${session.currentBalance.toFixed(2)} ብር`,
      session.lastReference ? `🔢 የመጨረሻ ማጣቀሻ: ${session.lastReference}` : null,
      "",
      "ክፍያ ከከፈሉ /paid ይተይቡ — ሱቁን አሳውቃለሁ።",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `🏪 ${session.shopName}`,
    "",
    `👤 ${session.customerName}`,
    `💰 Current balance: ${session.currentBalance.toFixed(2)} ETB`,
    session.lastReference ? `🔢 Latest ref: ${session.lastReference}` : null,
    "",
    "Type /paid if you've sent payment — I'll let the shop know.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHelpReply(linked: boolean, lang: Lang) {
  if (lang === "am") {
    const lines = [
      "📒 ጌባያ ቦት · እንዴት እንደሚሰራ",
      "",
      "እኔ ጌባያን (የንግድ ማስታወሻ) ለሚጠቀሙ ሱቆች የደንበኛ ጎን ቦት ነኝ።",
      "የሱቅ ባለቤቶች የዱቤ / ብድር ማስታወሻዎችን እና አስታዋሾችን ለመላክ ይጠቀሙኛል።",
      "",
      "ትዕዛዞች:",
      "  /start — ከሱቅዎ ጋር መገናኘት ይጀምሩ",
      "  /balance — የአሁኑን ቀሪ ሂሳብዎን ይፈትሹ",
      "  /paid — ሱቁን እንደከፈሉ ይንገሩ",
      "  /help — ይህን መልዕክት አሳው",
      "",
    ];
    if (!linked) {
      lines.push("ከ/start በላይ ትዕዛዞችን ለመጠቀም፣ የጌባያ አገናኛቸውን");
      lines.push("እንዲያጋሩልዎ ከሱቅ ባለቤትዎ ይጠይቁ። አገናኙን ይንኩ፣ ከዚያ Start ይንኩ።");
    } else {
      lines.push("አስቀድመው ተገናኝተዋል — አሁን /balance ይሞክሩ።");
    }
    return lines.join("\n");
  }
  const lines = [
    "📒 Gebya Bot · how it works",
    "",
    "I'm a customer-side bot for shops using Gebya (የንግድ ማስታወሻ).",
    "Shop owners use me to send dubie/credit updates and reminders.",
    "",
    "Commands:",
    "  /start — Begin linking with your shop",
    "  /balance — Check your current balance",
    "  /paid — Tell the shop you've paid",
    "  /help — Show this message",
    "",
  ];
  if (!linked) {
    lines.push("To use commands beyond /start, ask your shop owner to share");
    lines.push("their Gebya link with you. Tap the link, then tap Start.");
  } else {
    lines.push("You're already linked — try /balance now.");
  }
  return lines.join("\n");
}

function buildPaidReply(
  session: TelegramLinkSession | null,
  amount: string | null,
  lang: Lang,
) {
  if (!session) {
    if (lang === "am") {
      return [
        "ጌባያ",
        "",
        "ገና ከሱቅ ጋር አልተገናኙም፣ ስለዚህ ማንንም ማሳወቅ አልችልም።",
        "በቅድሚያ የጌባያ አገናኛቸውን እንዲያጋሩልዎ ከሱቅ ባለቤትዎ ይጠይቁ።",
      ].join("\n");
    }
    return [
      "Gebya",
      "",
      "You're not linked to a shop yet, so I can't notify anyone.",
      "Ask your shop owner to share their Gebya link with you first.",
    ].join("\n");
  }
  if (lang === "am") {
    const amountLineAm = amount
      ? `መጠን: ${amount}`
      : `በመዝገብ ላይ ያለ ቀሪ ሂሳብ: ${session.currentBalance.toFixed(2)} ብር`;
    return [
      `🏪 ${session.shopName}`,
      "",
      `✓ እናመሰግናለን፣ ${session.customerName} — ክፍያዎን አስቀምጫለሁ።`,
      amountLineAm,
      "",
      "የሱቅ ባለቤቱ በጌባያ መተግበሪያ ውስጥ ያረጋግጣል እና",
      "ቀሪ ሂሳብዎ ይዘምናል። በኋላ ለማረጋገጥ እንደገና /balance ይተይቡ።",
    ].join("\n");
  }
  const amountLine = amount
    ? `Amount: ${amount}`
    : `Current balance on file: ${session.currentBalance.toFixed(2)} ETB`;
  return [
    `🏪 ${session.shopName}`,
    "",
    `✓ Thanks, ${session.customerName} — I've noted your payment.`,
    amountLine,
    "",
    "The shop owner will confirm in their Gebya app and your balance",
    "will be updated. You can /balance again later to verify.",
  ].join("\n");
}

function buildFallbackReply(linked: boolean, lang: Lang) {
  if (lang === "am") {
    const lines = [
      "ያንን በትክክል አልገባኝም።",
      "",
      "ይሞክሩ:",
      "  /balance — ምን እንደተበደሩ ይፈትሹ",
      "  /paid — ሱቁን እንደከፈሉ ይንገሩ",
      "  /help — ሁሉንም ትዕዛዞች ይመልከቱ",
    ];
    if (!linked) {
      lines.push("");
      lines.push("ወይም የሱቅ ባለቤትዎ እንዲያገናኝዎት አገናኝ እንዲያጋሩ ይጠይቁ።");
    }
    return lines.join("\n");
  }
  const lines = [
    "I didn't quite understand that.",
    "",
    "Try:",
    "  /balance — check what you owe",
    "  /paid — tell the shop you've paid",
    "  /help — see all commands",
  ];
  if (!linked) {
    lines.push("");
    lines.push("Or ask your shop owner to share a link to connect you.");
  }
  return lines.join("\n");
}

export {
  getPublicApiBase,
  createDeepLink,
  pickLang,
  buildStartReply,
  buildBalanceReply,
  buildHelpReply,
  buildPaidReply,
  buildFallbackReply,
};
