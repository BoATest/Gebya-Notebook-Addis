// dev-listen.mjs — Run the API server locally with a real HTTP port.
//
// The app's main.ts only builds the Express app and exports it (it's served
// via Vercel serverless in production). This script imports the app and binds
// it to a port so the test harness (test-harness.js) can exercise the full
// flow against a live server.
//
// Required env vars (the app refuses to boot without them):
//   JWT_SECRET                 — auth signing secret
//   TELEGRAM_WEBHOOK_SECRET   — verifies inbound Telegram webhook calls
//   REMINDER_CRON_SECRET       — guards the /reminders/run cron trigger
//   VITE_TELEGRAM_BOT_USERNAME — the public bot username for deep links
//
// Usage:
//   npx tsx ./dev-listen.mjs            # listens on :4000
//   PORT=3000 npx tsx ./dev-listen.mjs  # custom port
//
// Then in another terminal:
//   API_BASE_URL=http://localhost:4000 node test-harness.js

import 'dotenv/config';
import app from './src/main.ts';

const PORT = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  console.log(`[dev-listen] API server listening on http://localhost:${PORT}`);
});
