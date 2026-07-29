import { useState, useMemo } from 'react';
import { Sparkles, Search, X, Trash2 } from 'lucide-react';
import {
  getChannelDefinition,
  updateChannel,
  removeChannel,
} from '../../utils/paymentChannels';
import { extractSubscriberDigits } from '../../utils/phoneNumber';
import ConfirmDialog from '../ConfirmDialog';

export default function PaymentChannelsSection({ channels, shopPhone, enabledCount, configuredCount, onChange, lang }) {
  const [query, setQuery] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  const wallets = useMemo(() => channels.filter(c => c.kind === 'wallet'), [channels]);
  const banks = useMemo(() => channels.filter(c => c.kind === 'bank'), [channels]);

  const q = query.trim().toLowerCase();

  const visibleWallets = useMemo(() => {
    if (!q) return wallets;
    return wallets.filter(c => c.name.toLowerCase().includes(q));
  }, [wallets, q]);

  const visibleBanks = useMemo(() => {
    if (!q) return banks;
    return banks.filter(c => c.name.toLowerCase().includes(q));
  }, [banks, q]);

  const hasResults = visibleWallets.length > 0 || visibleBanks.length > 0;

  const handleToggle = (channel) => {
    onChange?.(updateChannel(channels, channel.id, { enabled: !channel.enabled }));
  };
  const handleField = (channelId, field, value) => {
    onChange?.(updateChannel(channels, channelId, { [field]: value }));
  };
  const handleToggleSameAsShop = (channelId, isSame) => {
    const channel = channels.find(c => c.id === channelId);
    onChange?.(updateChannel(channels, channelId, {
      usePhoneFromShop: isSame,
      phone: isSame ? '' : (channel?.phone || ''),
    }));
  };
  const handleRemove = (channelId) => {
    setPendingRemoveId(channelId);
  };

  const confirmRemove = () => {
    const channelId = pendingRemoveId;
    setPendingRemoveId(null);
    if (!channelId) return;
    onChange?.(removeChannel(channels, channelId));
  };

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b" style={{ borderColor: '#f0f9f4' }}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" style={{ color: '#047857' }} />
            <p className="text-sm font-black" style={{ color: '#065f46' }}>
              {lang === 'am' ? 'የክፍያ መንገዶች' : 'Payment channels'}
            </p>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: configuredCount > 0 ? '#16a34a' : enabledCount > 0 ? '#b8842c' : '#94a3b8',
              color: '#fff',
            }}
          >
            {configuredCount}/{enabledCount} {lang === 'am' ? 'ተዋቅሯል' : 'configured'}
          </span>
        </div>
        <p className="text-[11px] leading-snug" style={{ color: '#047857' }}>
          {lang === 'am'
            ? 'መንገድ ይምረጡ — በሽያጭ መመዝገብ ጊዜ ይታያል።'
            : 'Enable channels — they appear when you record a sale.'}
        </p>
      </div>

      <div className="px-5 py-3 border-b" style={{ borderColor: '#f0f9f4' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'am' ? 'ባንኮች እና ዋሌቶችን ፈልጉ...' : 'Search banks and wallets...'}
            className="w-full pl-9 pr-8 py-2.5 border-2 text-sm focus:outline-none"
            style={{ borderRadius: 10, borderColor: '#e8e2d8', background: '#fff' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-b" style={{ borderBottom: '1px solid #f0f9f4' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
          📱 {lang === 'am' ? 'ሞባይል ዋሌት' : 'Mobile wallets'}
        </p>
        <div className="flex flex-col gap-2">
          {visibleWallets.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              shopPhone={shopPhone}
              onToggle={() => handleToggle(c)}
              onField={(field, value) => handleField(c.id, field, value)}
              onToggleSameAsShop={(v) => handleToggleSameAsShop(c.id, v)}
              onRemove={() => handleRemove(c.id)}
              lang={lang}
            />
          ))}
        </div>
      </div>

      <div className="px-5 py-3 border-b" style={{ borderBottom: '1px solid #f0f9f4' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
          🏦 {lang === 'am' ? 'ባንኮች' : 'Banks'}
        </p>
        <div className="flex flex-col gap-2">
          {visibleBanks.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              shopPhone={shopPhone}
              onToggle={() => handleToggle(c)}
              onField={(field, value) => handleField(c.id, field, value)}
              onToggleSameAsShop={(v) => handleToggleSameAsShop(c.id, v)}
              onRemove={() => handleRemove(c.id)}
              lang={lang}
            />
          ))}
        </div>
      </div>

      {!hasResults && (
        <div className="px-5 py-8 text-center">
          <Search className="w-8 h-8 mx-auto mb-2" style={{ color: '#e5e7eb' }} />
          <p className="text-xs font-medium" style={{ color: '#9ca3af' }}>
            {lang === 'am' ? 'ምንም ውጤት አልተገኘም' : 'No results'}
          </p>
        </div>
      )}

      <div className="px-5 pb-4">
        <p className="text-[10px] leading-snug" style={{ color: '#6b7280' }}>
          🔒{' '}
          {lang === 'am'
            ? 'መረጃው በዚህ ስልክ ላይ ብቻ ይቀመጣል። Gebya ገንዘቡን አያይም — እርስዎ በቀጥታ ይቀበላሉ።'
            : 'Stored on this phone only. Gebya never touches the money — customers pay you direct.'}
        </p>
      </div>

      <ConfirmDialog
        open={pendingRemoveId != null}
        tone="danger"
        title={lang === 'am' ? 'ይህን መንገድ ይሰርዙ?' : 'Remove this channel?'}
        message={lang === 'am' ? 'ይህ መንገድ ከዝርዝርዎ ይወገዳል።' : 'This channel will be removed from your list.'}
        confirmLabel={lang === 'am' ? 'አስወግድ' : 'Remove'}
        cancelLabel={lang === 'am' ? 'ሰርዝ' : 'Cancel'}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
    </div>
  );
}

function ChannelRow({ channel, shopPhone, onToggle, onField, onToggleSameAsShop, onRemove, lang }) {
  const def = getChannelDefinition(channel.id);
  const emoji = def?.emoji || (channel.kind === 'bank' ? '🏦' : '📱');
  const ussd = def?.ussd;

  const showPhone = channel.kind === 'wallet';
  const showAccount = channel.kind === 'bank' || channel.id === 'cbe_birr';
  const showSameAsShop = channel.id === 'telebirr';

  const effectivePhone = channel.usePhoneFromShop ? shopPhone : channel.phone;

  return (
    <div
      style={{
        background: channel.enabled ? '#f8fdf9' : '#fafafa',
        border: `1.5px solid ${channel.enabled ? '#86efac' : '#e5e7eb'}`,
        borderRadius: 12,
        padding: '10px 12px',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: channel.enabled ? '#1a1a1a' : '#6b7280' }}>
            {channel.name}
          </p>
          {ussd && channel.enabled && (
            <p className="text-[10px]" style={{ color: '#6b7280' }}>
              USSD {ussd}
              {effectivePhone && ` · ${effectivePhone}`}
            </p>
          )}
        </div>
        {channel.custom && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={lang === 'am' ? 'አስወግድ' : 'Remove'}
            className="press-scale"
            style={{
              padding: 4, color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={channel.enabled}
          aria-label={channel.enabled ? 'On' : 'Off'}
          className="press-scale"
          style={{
            width: 40, height: 24, borderRadius: 999,
            background: channel.enabled ? '#16a34a' : '#d1d5db',
            border: 'none', cursor: 'pointer', position: 'relative',
            flexShrink: 0, transition: 'background 0.15s ease',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 2, left: channel.enabled ? 18 : 2,
            width: 20, height: 20, borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
            transition: 'left 0.18s ease',
          }} />
        </button>
      </div>

      {channel.enabled && (showPhone || showAccount) && (
        <div className="mt-2.5 flex flex-col gap-2" style={{ paddingLeft: 28 }}>
          {showSameAsShop && (
            <label className="flex items-center gap-1.5 text-[12px] font-semibold cursor-pointer" style={{ color: '#047857' }}>
              <input
                type="checkbox"
                checked={!!channel.usePhoneFromShop}
                onChange={(e) => onToggleSameAsShop(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#16a34a' }}
              />
              {lang === 'am' ? 'ከሱቅ ስልክ ጋር አንድ' : 'Same as shop phone'}
              {channel.usePhoneFromShop && shopPhone && (
                <span className="ml-1 text-[11px] font-bold" style={{ color: '#065f46' }}>
                  ({shopPhone})
                </span>
              )}
            </label>
          )}
          {showPhone && !channel.usePhoneFromShop && (
            <div className="flex gap-0">
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 10px',
                  background: '#fff',
                  border: '2px solid #86efac', borderRight: 'none',
                  borderRadius: '8px 0 0 8px',
                  fontSize: '0.85rem', fontWeight: 800, color: '#1B4332',
                  minWidth: 56,
                }}
              >
                +251
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={extractSubscriberDigits(channel.phone)}
                onChange={(e) => onField('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder={lang === 'am' ? '9XXXXXXXX' : '9XXXXXXXX'}
                maxLength={9}
                className="flex-1 p-2 border-2 focus:outline-none text-sm"
                style={{
                  borderRadius: '0 8px 8px 0',
                  borderColor: '#86efac',
                  background: '#fff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>
          )}
          {showAccount && (
            <input
              type="text"
              inputMode="numeric"
              value={channel.account || ''}
              onChange={(e) => onField('account', e.target.value)}
              placeholder={lang === 'am'
                ? (channel.kind === 'bank' ? 'የመለያ ቁጥር' : 'CBE ባንክ መለያ (አማራጭ)')
                : (channel.kind === 'bank' ? 'Account number' : 'CBE bank account (optional)')}
              className="p-2 border-2 rounded-lg text-sm focus:outline-none"
              style={{
                borderColor: '#86efac',
                background: '#fff',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
