import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, MessageCircle, QrCode, RefreshCcw, Send, SkipForward, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fireToast } from './Toast';
import { useLang } from '../context/LangContext';
import { buildCustomerConnectLink, normalizeTelegram } from '../utils/customerTelegram';
import {
  createTelegramLinkSession,
  fetchTelegramBotStatus,
  fetchTelegramLinkSession,
} from '../utils/telegramBotClient';

function CustomerTelegramConnectSheet({ customer, shopProfile, onSave, onDone, onResendUpdate }) {
  const { t } = useLang();
  const [manualTelegram, setManualTelegram] = useState(customer?.telegram_username || '');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [botStatus, setBotStatus] = useState({
    configured: false,
    bot_username: null,
    linking_available: false,
    updates_available: false,
    warning: null,
  });
  const [linkSession, setLinkSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [telegramServiceAvailable, setTelegramServiceAvailable] = useState(true);
  const safeBotStatus = botStatus && typeof botStatus === 'object'
    ? botStatus
    : { configured: false, bot_username: null, linking_available: false, updates_available: false, warning: null };
  const normalizedTelegram = normalizeTelegram(manualTelegram);
  const telegramValid = !manualTelegram.trim() || !!normalizedTelegram;
  const hasLinkedBorrower = Boolean(customer?.telegram_chat_id || linkSession?.chat_id);
  const hasPendingLink = !hasLinkedBorrower && Boolean(customer?.telegram_link_requested_at || linkSession?.requested_at);

  const inviteLink = useMemo(
    () => buildCustomerConnectLink({
      botUsername: safeBotStatus.bot_username,
      shopTelegram: shopProfile?.telegram,
      shopName: shopProfile?.name,
      customerName: customer?.display_name,
      token: customer?.telegram_link_token,
    }),
    [safeBotStatus.bot_username, customer?.display_name, customer?.telegram_link_token, shopProfile?.name, shopProfile?.telegram]
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const status = await fetchTelegramBotStatus().catch(() => null);
        if (!active) return;
        if (status && typeof status === 'object') {
          setBotStatus(status);
          setTelegramServiceAvailable(Boolean(status.updates_available || status.configured));
        } else {
          setBotStatus({ configured: false, bot_username: null, linking_available: false, updates_available: false, warning: null });
          setTelegramServiceAvailable(false);
        }

        if (!customer?.telegram_link_token || !status?.linking_available) {
          setLoadingSession(false);
          return;
        }

        const session = await createTelegramLinkSession({
          token: customer.telegram_link_token,
          customerId: customer.id,
          customerName: customer.display_name,
          shopName: shopProfile?.name || 'Gebya',
          currentBalance: Number(customer?.balance || 0),
          updatesEnabled: !!customer?.telegram_notify_enabled,
        }).catch(() => null);

        if (!active) return;
        setLinkSession(session);
        if (!session) {
          setTelegramServiceAvailable(false);
        }
        if (session?.requested_at && !customer?.telegram_link_requested_at) {
          await onSave?.({
            telegram_link_requested_at: session.requested_at,
            showSavedToast: false,
            closeSheet: false,
          });
        }
      } finally {
        if (active) setLoadingSession(false);
      }
    }

    bootstrap();
    return () => { active = false; };
  }, [customer?.id, customer?.display_name, customer?.telegram_link_token, customer?.telegram_link_requested_at, customer?.balance, customer?.telegram_notify_enabled, shopProfile?.name, onSave]);

  useEffect(() => {
    if (!customer?.telegram_link_token || hasLinkedBorrower || !safeBotStatus.linking_available) return undefined;
    const interval = setInterval(async () => {
      const next = await fetchTelegramLinkSession(customer.telegram_link_token).catch(() => null);
      if (next) setLinkSession(next);
    }, 4000);
    return () => clearInterval(interval);
  }, [customer?.telegram_link_token, hasLinkedBorrower, safeBotStatus.linking_available]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      fireToast(t.inviteLinkCopied, 2000);
    } catch {
      fireToast(t.copyFailed, 2200);
    }
  };

  const handleRefresh = async () => {
    if (!customer?.telegram_link_token || !safeBotStatus.linking_available) return;
    const next = await fetchTelegramLinkSession(customer.telegram_link_token).catch(() => null);
    if (next) {
      setLinkSession(next);
      setTelegramServiceAvailable(true);
      fireToast(next.chat_id ? t.telegramLinkedOnTelegram : t.telegramWaitingForBorrower, 2200);
    } else {
      setTelegramServiceAvailable(false);
      fireToast(t.telegramManualStillWorks, 2400);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave?.({
        telegram_username: normalizedTelegram || linkSession?.telegram_username || customer?.telegram_username || null,
        telegram_chat_id: linkSession?.chat_id || customer?.telegram_chat_id || null,
        telegram_linked_at: linkSession?.linked_at || customer?.telegram_linked_at || null,
        telegram_link_requested_at: linkSession?.requested_at || customer?.telegram_link_requested_at || Date.now(),
      });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!onResendUpdate || resending) return;
    setResending(true);
    try {
      await onResendUpdate();
    } finally {
      setResending(false);
    }
  };

  const connectionLabel = hasLinkedBorrower
    ? t.telegramLinkedUpdatesReady
    : hasPendingLink
      ? t.telegramWaitingForBorrower
      : t.telegramGenerateLinkHint;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto animate-slide-up" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}>
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', borderColor: 'var(--color-border-light)' }}>
          <div className="flex justify-between items-center gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-900">{t.connectTelegram}</h2>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{customer?.display_name}</p>
            </div>
            <button onClick={onDone} aria-label={t.close} className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="p-4 border" style={{ background: hasLinkedBorrower ? '#f0fdf4' : '#f0f9ff', borderColor: hasLinkedBorrower ? '#bbf7d0' : '#bfdbfe', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 mt-0.5" style={{ color: hasLinkedBorrower ? '#166534' : '#2563eb' }} />
              <div>
                <p className="font-bold text-gray-900">{t.telegramAutoUpdatesTitle}</p>
                <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{connectionLabel}</p>
              </div>
            </div>
          </div>

          {telegramServiceAvailable && safeBotStatus.configured && safeBotStatus.linking_available ? (
            <>
              <div className="p-4 border text-center" style={{ background: '#fffdf7', borderColor: '#f6d79d', borderRadius: 'var(--radius-md)' }}>
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9a6700' }}>
                  <QrCode className="w-4 h-4" />
                  {t.qrPrimaryMethod}
                </div>
                <div className="inline-flex p-3 bg-white border" style={{ borderRadius: '20px', borderColor: '#f0e1bc' }}>
                  <QRCodeSVG value={inviteLink} size={176} bgColor="#ffffff" fgColor="#1B4332" />
                </div>
                <p className="text-sm mt-3" style={{ color: '#4b5563' }}>{t.telegramQrHint}</p>
              </div>

              <div className="p-4 border space-y-3" style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{t.shareInviteLink}</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{t.shareInviteLinkHint}</p>
                  </div>
                  <button type="button" onClick={handleCopy} className="px-3 py-2 text-sm font-black min-h-[44px] border press-scale" style={{ background: '#f8fafc', color: '#1f2937', borderColor: '#e5e7eb', borderRadius: 'var(--radius-sm)' }}>
                    <span className="inline-flex items-center gap-1">
                      <Copy className="w-4 h-4" />
                      {t.copyLink}
                    </span>
                  </button>
                </div>
                <div className="p-3 text-xs break-all" style={{ background: '#f8fafc', borderRadius: 'var(--radius-sm)', color: '#475569' }}>
                  {inviteLink}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => window.open(inviteLink, '_blank', 'noopener,noreferrer')} className="w-full p-3 font-black text-sm flex items-center justify-center gap-2 min-h-[48px] border press-scale" style={{ background: '#1B4332', color: '#fff', borderColor: '#1B4332', borderRadius: 'var(--radius-md)' }}>
                    <Send className="w-4 h-4" />
                    {t.telegramOpenBot}
                  </button>
                  <button type="button" onClick={handleRefresh} disabled={loadingSession} className="w-full p-3 font-black text-sm flex items-center justify-center gap-2 min-h-[48px] border press-scale" style={{ background: '#fff', color: '#374151', borderColor: '#e5e7eb', borderRadius: 'var(--radius-md)' }}>
                    <RefreshCcw className="w-4 h-4" />
                    {t.telegramRefreshStatus}
                  </button>
                </div>
                {linkSession?.telegram_username && (
                  <p className="text-xs" style={{ color: '#166534' }}>
                    {t.telegramBorrowerStartedAs.replace('{username}', linkSession.telegram_username)}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="p-4 border" style={{ background: '#fff7ed', borderColor: '#fed7aa', borderRadius: 'var(--radius-md)' }}>
              <p className="font-bold text-gray-900">
                {telegramServiceAvailable ? t.telegramLinkingUnavailable : t.telegramServiceUnavailableNow}
              </p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                {safeBotStatus.warning
                  ? safeBotStatus.warning
                  : telegramServiceAvailable
                    ? t.telegramManualCanEnableLater
                    : t.telegramApiServerNeeded}
              </p>
            </div>
          )}

          <div className="p-4 border space-y-2" style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <p className="font-bold text-gray-900">{t.manualTelegramFallback}</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>{t.manualTelegramFallbackHint}</p>
            <input
              type="text"
              value={manualTelegram}
              onChange={(e) => setManualTelegram(e.target.value)}
              placeholder={t.customerTelegramPlaceholder}
              className="w-full p-3 border-2 focus:outline-none text-sm"
              style={{ borderRadius: 'var(--radius-md)', borderColor: telegramValid ? '#e8e2d8' : '#dc2626' }}
            />
            {!telegramValid && (
              <p className="text-xs font-medium text-red-600">
                {t.telegramFormatHint}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-2 space-y-2">
          <button onClick={handleConfirm} disabled={saving || !telegramValid || (!hasLinkedBorrower && !normalizedTelegram)} className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 min-h-[56px] press-scale" style={{ background: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: saving || (!hasLinkedBorrower && !normalizedTelegram) || !telegramValid ? 'none' : '0 4px 0 #0f2b20, var(--shadow-sm)', opacity: telegramValid && (hasLinkedBorrower || normalizedTelegram) ? 1 : 0.45 }}>
            <CheckCircle2 className="w-5 h-5" />
            {saving ? t.saving : (hasLinkedBorrower ? t.confirmConnection : t.telegramSaveFallbackContact)}
          </button>
          {hasLinkedBorrower && (
            <button onClick={handleResend} type="button" disabled={resending} className="w-full p-4 font-black text-sm flex items-center justify-center gap-2 min-h-[52px] border press-scale" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', borderRadius: 'var(--radius-md)' }}>
              <RefreshCcw className="w-4 h-4" />
              {resending ? t.telegramResending : t.telegramResendLatestUpdate}
            </button>
          )}
          <button onClick={onDone} type="button" className="w-full p-4 font-black text-sm flex items-center justify-center gap-2 min-h-[52px] border press-scale" style={{ background: '#fff', color: '#4b5563', borderColor: '#e5e7eb', borderRadius: 'var(--radius-md)' }}>
            <SkipForward className="w-4 h-4" />
            {t.skipForNow}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerTelegramConnectSheet;
