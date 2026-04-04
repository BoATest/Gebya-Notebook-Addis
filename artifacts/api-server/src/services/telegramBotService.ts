const TELEGRAM_API_BASE = "https://api.telegram.org";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || "";
}

export function getTelegramBotUsername() {
  return getRequiredEnv("TELEGRAM_BOT_USERNAME");
}

export function isTelegramBotConfigured() {
  return Boolean(getRequiredEnv("TELEGRAM_BOT_TOKEN") && getTelegramBotUsername());
}

export async function sendTelegramTextMessage(chatId: string, text: string) {
  const botToken = getRequiredEnv("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    throw new Error("Telegram bot token is not configured");
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const description = data?.description || `Telegram send failed (${response.status})`;
    throw new Error(description);
  }

  return data.result;
}

