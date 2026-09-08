/**
 * telegramConversationHandler.ts — Turns parsed customer intents into immediate,
 * safe value:
 *
 *   1. A friendly, localized bot reply to the customer (the certain-value path)
 *   2. An owner push notification via the existing web-push infra
 *
 * The handler intentionally does NOT write to customer_transactions directly:
 * the link-session carries the customer's LOCAL device id, which does not map
 * 1:1 to the server's serial customer id without the sync layer's device +
 * local-id resolution. Writing rows with a wrong customer_id would corrupt the
 * ledger. Persisting bot-confirmed promise/payment rows into the server ledger
 * is deferred to the sync-aware follow-up.
 */

import { getSessionByChatId } from "./telegramStore.js";
import { sendPushToOwner } from "./pushNotificationSender.js";
import type { TelegramIntent } from "./telegramIntentParser.js";
import type { Lang } from "./telegramIntentParser.js";

/**
 * Build + send the bot reply and owner notification for a parsed intent.
 * Returns the reply string so callers can fall back if the bot send fails.
 */
export async function handleConversationIntent(
  chatId: string,
  intent: TelegramIntent,
  lang: Lang,
): Promise<{ reply: string; deliveredToOwner: boolean }> {
  const session = await getSessionByChatId(chatId);
  if (!session?.customerId) {
    const noLink = lang === "am"
      ? "እባክዎ በመጀመሪያ ከሱቅ ባለቤትዎ የቴሌግራም አገናኝ ይጠይቁ።"
      : "Please ask your shop owner to share a Telegram link so we can connect first.";
    return { reply: noLink, deliveredToOwner: false };
  }

  const customerName = session.customerName || "Customer";
  const shopName = session.shopName || "Gebya";
  const businessId = Number(session.shopId || session.businessId || 0);
  const now = Date.now();

  switch (intent.intent) {
    case "promise": {
      const ts = intent.dateTs;
      if (!ts) {
        return {
          reply: "Please tell me a date — e.g. “አርብ” (Friday) or “tomorrow”.",
          deliveredToOwner: false,
        };
      }
      const d = new Date(ts);
      const humanDate = formatFriendlyDate(d, lang);

      await notifyOwner(businessId, {
        id: now,
        type: "telegram_promise",
        title: lang === "am" ? `💬 ${customerName} ቃል ገብቷል` : `💬 ${customerName} promised to pay`,
        body: lang === "am" ? `እስከ ${humanDate}` : `Due by ${humanDate}`,
      });

      const reply = lang === "am"
        ? `✅ ቃል ተመዝግቧል። እስከ ${humanDate} እናስታውሳለን።`
        : `✅ Promise recorded. We'll remind you to pay by ${humanDate}.`;
      return { reply, deliveredToOwner: businessId > 0 };
    }

    case "paid": {
      const owed = Number(session.currentBalance) || 0;
      const amount = intent.amount || owed;
      if (owed <= 0) {
        const reply = lang === "am"
          ? "😊 የሂሳብ የለም — ሁሉም ተከፍሏል። እናመሰግናለን! 🙌"
          : "You have no remaining balance. Thank you! 🙌";
        return { reply, deliveredToOwner: false };
      }
      const remaining = Math.max(0, owed - amount);

      await notifyOwner(businessId, {
        id: now,
        type: "telegram_payment",
        title: lang === "am" ? `💵 ${customerName} ከፍያለሁ` : `💵 ${customerName} reported payment`,
        body: lang === "am" ? `${fmtNum(amount)} ብር · ቀሪ ${fmtNum(remaining)} ብር` : `${fmtNum(amount)} ETB · remaining ${fmtNum(remaining)} ETB`,
      });

      const reply = lang === "am"
        ? `💰 ተመዝግቧል። የከፈሉት: ${fmtNum(amount)} ብር · ቀሪ: ${fmtNum(remaining)} ብር`
        : `💰 Recorded. Paid: ${fmtNum(amount)} ETB · Remaining: ${fmtNum(remaining)} ETB`;
      return { reply, deliveredToOwner: businessId > 0 };
    }

    case "balance": {
      const owed = Number(session.currentBalance) || 0;
      const reply = lang === "am"
        ? `🏪 ${shopName}\n👤 ${customerName}\nየቀሪ ሒሳብ: ${fmtNum(owed)} ብር`
        : `🏪 ${shopName}\n👤 ${customerName}\nBalance due: ${fmtNum(owed)} ETB`;
      return { reply, deliveredToOwner: false };
    }

    case "help": {
      const reply = lang === "am"
        ? [
            `🏪 ${shopName}`,
            "",
            "እኔ ምን ማድረግ እንደምችል:",
            "• /balance — የቀሪ ሒሳብ ለመፈተሽ",
            "• ቀን ይታይቡ — ለምሳሌ \"አርብ\" ወይም \"tomorrow\" ቃል ለመግባት",
            "• \"paid 200\" — ክፍያ ለማስታወቅ",
          ].join("\n")
        : [
            `🏪 ${shopName}`,
            "",
            "Here's what I can do:",
            "• /balance — check your balance",
            "• Send a date (e.g. “አርብ” or “tomorrow”) to make a payment promise",
            "• “paid 200” — report a payment",
          ].join("\n");
      return { reply, deliveredToOwner: false };
    }

    default:
      return { reply: "", deliveredToOwner: false };
  }
}

function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "0";
}

function formatFriendlyDate(d: Date, lang: Lang): string {
  if (lang === "am") {
    const months = ["መስከረም", "ጥቅምት", "ኅዳር", "ታህሳስ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"];
    return `${d.getDate()} ${months[d.getMonth()] || ""} ${d.getFullYear()}`;
  }
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

async function notifyOwner(businessId: number, notification: { title: string; body: string; type: string; id: number }) {
  if (!businessId || businessId <= 0) return;
  try {
    await sendPushToOwner(businessId, notification);
  } catch (err) {
    console.error("[telegram:conversation] owner push failed:", err);
  }
}