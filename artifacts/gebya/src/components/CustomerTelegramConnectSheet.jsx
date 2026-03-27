import { useMemo, useState } from 'react';
import { CheckCircle2, Copy, MessageCircle, QrCode, SkipForward, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fireToast } from './Toast';
import { useLang } from '../context/LangContext';
import { buildCustomerConnectLink, normalizeTelegram } from '../utils/customerTelegram';

function CustomerTelegramConnectSheet({ customer, shopProfile, onSave, onDone }) {
  const { t } = useLang();
  const [manualTelegram, setManualTelegram] = useState(customer?.telegram_username || '');
  const [saving, setSaving] = useState(false);

  const inviteLink = useMemo(
    () => buildCustomerConnectLink({
      shopTelegram: shopProfile?.telegram,
      shopName: shopProfile?.name,
      customerName: customer?.display_name,
      token: customer?.telegram_link_token,
    }),
    [customer?.display_name, customer?.telegram_link_token, shopProfile?.name, shopProfile?.telegram]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      fireToast(t.inviteLinkCopied, 2000);
    } catch {
      fireToast(t.copyFailed, 2200);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onSave?.({
        telegram_username: normalizeTelegram(manualTelegram) || null,
      });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

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
          <div className="p-4 border" style={{ background: '#f0f9ff', borderColor: '#bfdbfe', borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 mt-0.5" style={{ color: '#2563eb' }} />
              <div>
                <p className="font-bold text-gray-900">{t.telegramAutoUpdatesTitle}</p>
                <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{t.telegramAutoUpdatesBody}</p>
              </div>
            </div>
          </div>

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
          </div>

          <div className="p-4 border space-y-2" style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <p className="font-bold text-gray-900">{t.manualTelegramFallback}</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>{t.manualTelegramFallbackHint}</p>
            <input
              type="text"
              value={manualTelegram}
              onChange={(e) => setManualTelegram(e.target.value)}
              placeholder={t.customerTelegramPlaceholder}
              className="w-full p-3 border-2 focus:outline-none text-sm"
              style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
            />
          </div>
        </div>

        <div className="px-6 pb-8 pt-2 space-y-2">
          <button onClick={handleConfirm} disabled={saving} className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 min-h-[56px] press-scale" style={{ background: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #0f2b20, var(--shadow-sm)' }}>
            <CheckCircle2 className="w-5 h-5" />
            {saving ? t.saving : t.confirmConnection}
          </button>
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
