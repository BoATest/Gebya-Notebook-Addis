import { useRef, useState, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { useAuthStore } from '../stores/authStore';
import { setIdentity } from '../db';

export default function BusinessSelector({ shopProfile, currentBusinessId }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { lang, t } = useLang();
  const businesses = useAuthStore(s => s.businesses);
  const setCurrentBusiness = useAuthStore(s => s.setCurrentBusiness);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = businesses.find(b => String(b.business_id) === String(currentBusinessId));

  const switchBusiness = async (targetBiz) => {
    const bizId = targetBiz.business_id;
    setCurrentBusiness(bizId);
    setOpen(false);
    await setIdentity({
      key: 'me',
      shop_id: bizId,
      shop_name: targetBiz.name,
      role: targetBiz.role,
      permissions: targetBiz.permissions,
    });
    window.location.reload();
  };

  if (!businesses || businesses.length < 2) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 press-scale"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontSize: 'inherit', fontWeight: 'inherit',
          color: 'inherit', maxWidth: '100%',
        }}
      >
        <span className="truncate">{current?.name || shopProfile?.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 100, marginTop: 6, overflow: 'hidden',
            minWidth: 200,
          }}
        >
          <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('Switch shop', 'ሱቅ ቀይር')}
          </div>
          {businesses.map(biz => {
            const active = String(biz.business_id) === String(currentBusinessId);
            return (
              <button
                key={biz.business_id}
                onClick={() => !active && switchBusiness(biz)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px',
                  background: active ? '#f3f4f6' : 'transparent',
                  border: 'none', cursor: active ? 'default' : 'pointer',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  color: '#1a1a1a', textAlign: 'left',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: active ? '#1B4332' : '#e5e7eb',
                  color: active ? '#fff' : '#6b7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {biz.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 14, fontWeight: active ? 600 : 400 }}>{biz.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    {String(biz.role || '').replace(/_/g, ' ')}
                  </div>
                </div>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
