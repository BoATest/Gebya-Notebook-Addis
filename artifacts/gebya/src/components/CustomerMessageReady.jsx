import { useState } from 'react';
import { Copy, MessageCircle, Phone, X } from 'lucide-react';
import { buildCreditAddedMessage, buildPaymentReceiptMessage } from '../utils/customerReminder';

function CustomerMessageReady({ customer, shopName, type, amount, itemNote, dueDate, balance, onDone }) {
  const [copied, setCopied] = useState(false);

  const isCredit = type === 'credit';
  const message = isCredit
    ? buildCreditAddedMessage({ customer, shopName, amount, itemNote, dueDate, balance })
    : buildPaymentReceiptMessage({ customer, shopName, amount, balance });

  const hasPhone = Boolean(customer?.phone_number || customer?.phoneNumber);
  const hasTelegram = Boolean(customer?.telegram_username || customer?.telegramUsername || customer?.telegram_username);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing, user can still see the message
    }
  };

  const handleSMS = () => {
    if (!hasPhone) return;
    const encodedBody = encodeURIComponent(message);
    window.open(`sms:?body=${encodedBody}`, '_blank');
  };

  const handleTelegram = () => {
    const telegram = customer?.telegram_username || customer?.telegramUsername;
    if (!telegram) return;
    const normalized = telegram.startsWith('@') ? telegram.slice(1) : telegram;
    const encoded = encodeURIComponent(message);
    window.open(`https://t.me/${normalized}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
      <div
        className="bg-white w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', borderColor: 'var(--color-border-light)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide font-black" style={{ color: '#C4883A' }}>
                {isCredit ? 'Credit saved' : 'Payment saved'}
              </p>
              <h2 className="text-xl font-black text-gray-900 leading-tight">
                {isCredit ? 'Customer copy is ready' : 'Receipt is ready'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onDone}
              aria-label="Done"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div
            className="p-4 border"
            style={{
              background: isCredit ? '#fffbeb' : '#f0fdf4',
              borderColor: isCredit ? '#fde68a' : '#bbf7d0',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed" style={{ color: '#374151' }}>
              {message}
            </pre>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {hasPhone && (
              <button
                type="button"
                onClick={handleSMS}
                className="w-full p-3 font-black text-white min-h-[52px] flex items-center justify-center gap-2 press-scale"
                style={{ background: '#166534', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #14532d' }}
              >
                <Phone className="w-5 h-5" />
                Send SMS
              </button>
            )}

            {!hasPhone && (
              <div
                className="w-full p-3 min-h-[52px] flex items-center justify-center gap-2"
                style={{ background: '#f3f4f6', borderRadius: 'var(--radius-md)', color: '#9ca3af' }}
              >
                <Phone className="w-5 h-5" />
                <span className="text-sm font-semibold">Add mobile number to send SMS</span>
              </div>
            )}

            {hasTelegram && (
              <button
                type="button"
                onClick={handleTelegram}
                className="w-full p-3 font-black text-white min-h-[52px] flex items-center justify-center gap-2 press-scale"
                style={{ background: '#2481cc', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1a5f94' }}
              >
                <MessageCircle className="w-5 h-5" />
                Send via Telegram
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="w-full p-3 font-black text-white min-h-[52px] flex items-center justify-center gap-2 press-scale"
              style={{ background: copied ? '#059669' : '#374151', borderRadius: 'var(--radius-md)', boxShadow: copied ? 'none' : '0 4px 0 #1f2937' }}
            >
              <Copy className="w-5 h-5" />
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>

            <button
              type="button"
              onClick={onDone}
              className="w-full p-3 font-semibold text-sm min-h-[44px] flex items-center justify-center press-scale"
              style={{ color: '#6b7280', borderRadius: 'var(--radius-md)' }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerMessageReady;