// CustomerTelegramConnectSheet.jsx — Minimal 1-tap Telegram linking.
//
// The shop owner shows this to the customer to connect them on Telegram.
// The system generates a deep link + QR code automatically. When the
// customer taps "Start" in the bot, the sheet auto-saves the chat_id.
//
// That's it. No instructions, no status chips, no refresh buttons.

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Copy, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fireToast } from './Toast';
import { useLang } from '../context/LangContext';
import { buildCustomerConnectLink, createCustomerTelegramLinkToken } from '../utils/customerTelegram';
import {
  fetchTelegramBotStatus,
  fetchTelegramLinkSession,
  createTelegramLinkSession,
} from '../utils/telegramBotClient';

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const FRONTEND_BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '').trim();

function CustomerTelegramConnectSheet({ customer, shopProfile, onSave, onDone, onResendUpdate }) {
  const { lang } = useLang();
  const [botUsername, setBotUsername] = useState(FRONTEND_BOT_USERNAME);
  const [linkSession, setLinkSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const pollStartedRef = useRef(false);
  const autoSavedRef = useRef(false);
  const sessionCreatedRef = useRef(false);

  const hasLinkedBorrower = Boolean(customer?.telegram_chat_id || linkSession?.chat_id);
  // Auto-generate a token if the customer record doesn't have one yet (legacy/synced customers)
  const token = customer?.telegram_link_token || createCustomerTelegramLinkToken(customer?.id);

  // ─── Get bot username + create session + poll for completion ──────────
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    const shopId = shopProfile?.shop_id || shopProfile?.id;

    fetchTelegramBotStatus().then(status => {
      if (!active) return;
      setBotUsername(status?.bot_username || status?.bot_username || FRONTEND_BOT_USERNAME);
    }).catch(() => {});

    // Create the backend link session so the customer's /start can be resolved.
    // The webhook's linkTelegramChatToSession requires an existing session for the token.
    if (!sessionCreatedRef.current) {
      sessionCreatedRef.current = true;
      createTelegramLinkSession({
        shopId,
        token,
        customerId: customer?.id,
        customerName: customer?.display_name || "Customer",
        shopName: shopProfile?.name || "Gebya",
        currentBalance: Number(customer?.balance || 0),
        updatesEnabled: Boolean(customer?.telegram_notify_enabled),
      }).catch(err => {
        console.error('Failed to create Telegram link session:', err);
      });
    }

    // Poll for session completion (customer tapped "Start")
    if (!hasLinkedBorrower && !pollStartedRef.current && token) {
      pollStartedRef.current = true;
      const startTime = Date.now();

      const poll = async () => {
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          pollStartedRef.current = false;
          return;
        }

        try {
          const session = await fetchTelegramLinkSession(token);
          if (session) {
            setLinkSession(session);
            if (session.chat_id && !autoSavedRef.current) {
              autoSavedRef.current = true;
              pollStartedRef.current = false;

              setAutoLinking(true);
              onSave?.({
                telegram_username: session.telegram_username,
                telegram_chat_id: session.chat_id,
                telegram_linked_at: session.linked_at,
                telegram_link_requested_at: session.requested_at || customer?.telegram_link_requested_at,
                telegram_link_token: token,
              }).then(() => {
                fireToast(lang === 'am' ? 'ቴሌግራም ተገናኝቷል' : 'Telegram connected', 1800);
                onResendUpdate?.();
              }).catch(err => {
                console.error('Auto-link save failed:', err);
                autoSavedRef.current = false;
              }).finally(() => setAutoLinking(false));
            }
          }
        } catch { /* ignore */ }

      };

      const id = setInterval(poll, POLL_INTERVAL_MS);
      poll(); // initial check

      return () => { clearInterval(id); pollStartedRef.current = false; };
    }
  }, [token, hasLinkedBorrower, customer?.telegram_link_requested_at, lang, onSave, onResendUpdate, shopProfile]);

  const deepLink = useMemo(
    () => token && botUsername
      ? buildCustomerConnectLink({
          botUsername,
          token,
          customerName: customer?.display_name,
          shopName: shopProfile?.name,
          shopTelegram: shopProfile?.telegram,
        })
      : '',
    [botUsername, token, customer?.display_name, shopProfile?.name, shopProfile?.telegram]
  );

  const handleCopy = async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      fireToast(lang === 'am' ? 'መቅዳት አልተሳካም' : 'Could not copy', 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="bg-white w-full max-w-xs mx-4 text-center"
        style={{
          borderRadius: 24,
          padding: 28,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
        }}
      >
        {/* Close */}
        <button
          onClick={onDone}
          aria-label={lang === 'am' ? 'ዝጋ' : 'Close'}
          className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Customer name */}
        <h2 className="text-lg font-bold text-gray-900 mb-1 truncate">
          {customer?.display_name || (lang === 'am' ? 'ደንበኛ' : 'Customer')}
        </h2>
        <p className="text-xs text-gray-500 mb-5 truncate">
          {shopProfile?.name || 'Gebya'}
        </p>

        {!deepLink && !loading && (
          <p className="text-sm text-gray-500 py-8">
            {lang === 'am' ? 'መረጃ የለም' : 'No link token for this customer'}
          </p>
        )}

        {deepLink && (
          <>
            {/* QR Code — customer scans with Telegram */}
            <div className="flex justify-center mb-4 p-2 bg-white border-2 border-gray-100 rounded-2xl">
              <QRCodeSVG value={deepLink} size={168} fgColor="#16425b" />
            </div>

            {/* Deep link / copy */}
            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-3 mb-3 text-center font-bold text-white text-sm rounded-xl press-scale"
              style={{
                background: hasLinkedBorrower ? '#15803d' : '#1e3a8a',
                boxShadow: '0 3px 0 #0f2b2030',
              }}
            >
              {hasLinkedBorrower && autoLinking
                ? (lang === 'am' ? 'በራስ ይታያል...' : 'Linking...')
                : hasLinkedBorrower
                  ? (lang === 'am' ? '✓ ተገናኝቷል' : '✓ Linked')
                  : (lang === 'am' ? 'ቴሌግራም ይክፈቱ' : 'Open in Telegram')}
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full p-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg press-scale"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied
                ? (lang === 'am' ? 'ተቀოዜ!' : 'Copied!')
                : (lang === 'am' ? 'አገናኝ ቅዳ' : 'Copy link')}
            </button>
          </>
        )}

        {/* Auto-linking hint */}
        {deepLink && !hasLinkedBorrower && (
          <p className="text-[10px] text-gray-400 mt-3">
            {lang === 'am'
              ? 'ደንበኛው በStart በኋላ በራስ ይታያል'
              : 'Customer taps Start → linked automatically'}
          </p>
        )}
      </div>
    </div>
  );
}

export default CustomerTelegramConnectSheet;
