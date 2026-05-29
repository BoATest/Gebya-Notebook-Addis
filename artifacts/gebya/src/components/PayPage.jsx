// PayPage.jsx — Customer-facing payment channel picker.
//
// Reached via URL: /pay?to={shop}&amount={n}&from={customer}&ref={id}&phone={shop_phone}&tg={shop_telegram}
//
// Pure client-side. Reads URL params. Renders a static page that lists the
// most common Ethiopian payment channels:
//   - telebirr (USSD *127# or open app)
//   - CBE Birr (USSD *847#)
//   - Awash Mobile (USSD *901#)
//   - Bank transfer · shows shop contact info with copy button
//
// We DO NOT process money. We route. The customer pays direct to the shop's
// account; the shop confirms manually in Gebya when the money arrives.
//
// Privacy promise · visible at the bottom · no data leaves their phone.

import { useEffect, useMemo, useState } from 'react';

function decodeParam(value) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch { return value; }
}

function readUrlParams() {
  if (typeof window === 'undefined') return {};
  const u = new URLSearchParams(window.location.search);
  return {
    to: decodeParam(u.get('to')),
    amount: decodeParam(u.get('amount')),
    from: decodeParam(u.get('from')),
    ref: decodeParam(u.get('ref')),
    phone: decodeParam(u.get('phone')),
    tg: decodeParam(u.get('tg')),
    cbe: decodeParam(u.get('cbe')),
    awash: decodeParam(u.get('awash')),
    lang: (u.get('lang') === 'am') ? 'am' : 'en',
  };
}

function formatAmount(s) {
  if (!s) return '';
  const n = Number(String(s).replace(/[^\d.]/g, ''));
  if (Number.isNaN(n)) return s;
  return n.toLocaleString('en-US');
}

const TEXT = {
  en: {
    title: 'Pay to',
    youOwe: 'You owe',
    birr: 'birr',
    from: 'from',
    forCredit: 'for credit',
    popular: 'Most popular in Ethiopia',
    bankTransfer: 'Bank transfer',
    telebirrName: 'telebirr',
    telebirrSub: 'Open telebirr app · or USSD *127#',
    telebirrTag: '⭐ MOST USED',
    cbeName: 'CBE Birr',
    cbeSub: 'Open CBE Mobile · or USSD *847#',
    awashName: 'Awash Mobile',
    awashSub: 'Open Awash app · or USSD *901#',
    bankName: 'Send via bank or other',
    bankSubWithPhone: 'Contact the shop on',
    bankSubNoContact: 'Pay in person or coordinate with the shop',
    copy: 'Copy',
    copied: 'Copied!',
    privacy: '🔒 Gebya doesn\'t see your money. Pay direct to the shop, they\'ll confirm when it arrives.',
    poweredBy: 'Powered by Gebya · የንግድ ማስታወሻ',
  },
  am: {
    title: 'ይክፈሉ ለ',
    youOwe: 'መክፈል ያለቦት',
    birr: 'ብር',
    from: 'ከ',
    forCredit: 'ለዱቤ',
    popular: 'በኢትዮጵያ በብዛት ጥቅም ላይ',
    bankTransfer: 'ባንክ ዝውውር',
    telebirrName: 'telebirr',
    telebirrSub: 'telebirr ይክፈቱ · ወይም *127# ይደውሉ',
    telebirrTag: '⭐ በብዛት',
    cbeName: 'CBE Birr',
    cbeSub: 'CBE Mobile ይክፈቱ · ወይም *847# ይደውሉ',
    awashName: 'Awash Mobile',
    awashSub: 'Awash ይክፈቱ · ወይም *901# ይደውሉ',
    bankName: 'በባንክ ወይም ሌላ ይክፈሉ',
    bankSubWithPhone: 'ለመገናኘት',
    bankSubNoContact: 'በአካል ይክፈሉ ወይም ሱቅ ቤት ይገናኙ',
    copy: 'ቅዳ',
    copied: 'ተቀዳ!',
    privacy: '🔒 Gebya ገንዘብዎን አያይም። ለሱቁ በቀጥታ ይክፈሉ።',
    poweredBy: 'በ Gebya የተደገፈ · የንግድ ማስታወሻ',
  },
};

function PayPage() {
  const params = useMemo(() => readUrlParams(), []);
  const [copied, setCopied] = useState(null); // null | 'phone' | 'tg' | etc.
  const t = TEXT[params.lang] || TEXT.en;

  useEffect(() => {
    // Set page title for browser tab
    if (typeof document !== 'undefined' && params.to) {
      document.title = `${t.title} ${params.to}`;
    }
  }, [params.to, params.lang, t.title]);

  const copyText = async (text, key) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  // No-params fallback — show a friendly placeholder
  if (!params.to && !params.amount) {
    return (
      <div style={pageStyle()}>
        <div style={cardStyle()}>
          <p style={{ fontSize: '1rem', color: '#1f2937', textAlign: 'center' }}>
            This is a Gebya payment link page. Open a real link from a shop's reminder.
          </p>
        </div>
      </div>
    );
  }

  const amountDisplay = formatAmount(params.amount);

  return (
    <div style={pageStyle()}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {t.title}
          </p>
          <h1 style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontSize: '1.6rem', fontWeight: 800, marginTop: 4, color: '#1f2937',
            letterSpacing: '-0.02em',
          }}>
            {params.to || '—'}
          </h1>
          {params.from && (
            <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>
              {t.from} <strong style={{ color: '#1f2937' }}>{params.from}</strong>
            </p>
          )}
        </div>

        {/* Amount card */}
        <div style={{
          background: '#fff',
          border: '1px solid #ece6d6',
          borderRadius: 14,
          padding: 22,
          textAlign: 'center',
          marginBottom: 22,
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)',
        }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 800,
            color: '#92400e', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {t.youOwe}
          </p>
          <p style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontSize: '2.4rem', fontWeight: 800, color: '#b8842c',
            margin: '8px 0 4px',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {amountDisplay}
            <span style={{ fontSize: '1rem', color: '#9ca3af', marginLeft: 6, fontWeight: 600 }}>
              {t.birr}
            </span>
          </p>
          {params.ref && (
            <p style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
              ref · {params.ref}
            </p>
          )}
        </div>

        <p style={sectionLabelStyle()}>{t.popular}</p>

        {/* Telebirr — featured */}
        <ChannelCard
          icon="💛"
          iconBg="#ffeb3b"
          iconColor="#1f2937"
          name={t.telebirrName}
          sub={t.telebirrSub}
          tag={t.telebirrTag}
          tagBg="#d1f4e0"
          tagColor="#047857"
          onClick={() => {
            // Open telebirr USSD; some phones will prompt to dial
            window.location.href = 'tel:*127%23';
          }}
          featured
        />

        <ChannelCard
          icon="💜"
          iconBg="#5d3a98"
          iconColor="#fff"
          name={t.cbeName}
          sub={t.cbeSub}
          onClick={() => { window.location.href = 'tel:*847%23'; }}
        />

        <ChannelCard
          icon="🟡"
          iconBg="#d4af37"
          iconColor="#1f2937"
          name={t.awashName}
          sub={t.awashSub}
          onClick={() => { window.location.href = 'tel:*901%23'; }}
        />

        <p style={sectionLabelStyle()}>{t.bankTransfer}</p>

        {/* Bank / contact card */}
        <div style={{
          background: '#fff',
          border: '1px solid #ece6d6',
          borderRadius: 12,
          padding: 14,
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#1a1a1a', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0,
            }}>🏦</div>
            <p style={{ flex: 1, fontSize: '0.92rem', fontWeight: 700, color: '#1f2937' }}>
              {t.bankName}
            </p>
          </div>
          {(params.phone || params.tg) ? (
            <>
              <p style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: 8 }}>
                {t.bankSubWithPhone}:
              </p>
              {params.phone && (
                <ContactRow
                  label="📞"
                  value={params.phone}
                  onCopy={() => copyText(params.phone, 'phone')}
                  copied={copied === 'phone'}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                />
              )}
              {params.tg && (
                <ContactRow
                  label="💬"
                  value={params.tg}
                  onCopy={() => copyText(params.tg, 'tg')}
                  copied={copied === 'tg'}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                />
              )}
              {params.cbe && (
                <ContactRow
                  label="CBE"
                  value={params.cbe}
                  onCopy={() => copyText(params.cbe, 'cbe')}
                  copied={copied === 'cbe'}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                />
              )}
            </>
          ) : (
            <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              {t.bankSubNoContact}
            </p>
          )}
        </div>

        {/* Privacy line · explicit */}
        <div style={{
          marginTop: 18,
          padding: 14,
          background: '#f0fdf4',
          border: '1px solid #a3e9c1',
          borderRadius: 10,
          fontSize: '0.78rem',
          color: '#064e3b',
          textAlign: 'center',
          lineHeight: 1.55,
        }}>
          {t.privacy}
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', marginTop: 18,
          fontSize: '0.7rem', color: '#9ca3af',
        }}>
          {t.poweredBy}
        </p>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────
function pageStyle() {
  return {
    minHeight: '100vh',
    minHeight: '100svh',
    background: '#f9f6f0',
    fontFamily: "'Inter', 'Noto Sans Ethiopic', system-ui, sans-serif",
    color: '#1f2937',
    padding: 0,
  };
}
function cardStyle() {
  return {
    maxWidth: 480, margin: '40px auto', padding: 24,
    background: '#fff', border: '1px solid #ece6d6', borderRadius: 14,
  };
}
function sectionLabelStyle() {
  return {
    fontSize: '0.62rem', fontWeight: 800,
    color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase',
    margin: '12px 4px 6px',
  };
}

function ChannelCard({ icon, iconBg, iconColor, name, sub, tag, tagBg, tagColor, onClick, featured }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: featured ? 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' : '#fff',
        border: `1px solid ${featured ? '#a3e9c1' : '#ece6d6'}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 6 }}>
          {name}
          {tag && (
            <span style={{
              display: 'inline-block',
              fontSize: '0.58rem', fontWeight: 800,
              background: tagBg, color: tagColor,
              padding: '2px 6px', borderRadius: 4,
              letterSpacing: '0.04em',
            }}>
              {tag}
            </span>
          )}
        </p>
        <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 2 }}>{sub}</p>
      </div>
      <span style={{ fontSize: '1.1rem', color: '#9ca3af' }}>→</span>
    </button>
  );
}

function ContactRow({ label, value, onCopy, copied, copyLabel, copiedLabel }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      background: '#f9f6f0',
      border: '1px solid #ece6d6',
      borderRadius: 8,
      marginBottom: 4,
    }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      <button
        type="button"
        onClick={onCopy}
        style={{
          background: copied ? '#047857' : '#1a1a1a',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: '0.7rem', fontWeight: 800,
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {copied ? `✓ ${copiedLabel}` : copyLabel}
      </button>
    </div>
  );
}

export default PayPage;
