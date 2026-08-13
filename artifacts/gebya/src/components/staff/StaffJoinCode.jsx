import { useState } from 'react';
import { KeyRound, RotateCcw } from 'lucide-react';
import { fireToast } from '../Toast';

export default function StaffJoinCode({ shopProfile, onRotateJoinCode, t }) {
  const [rotating, setRotating] = useState(false);

  const handleRotate = async () => {
    if (rotating || !onRotateJoinCode) return;
    setRotating(true);
    try {
      const result = await onRotateJoinCode(shopProfile?.shop_id || shopProfile?.id);
      if (result?.error) fireToast(`${t('Failed to reset join code', 'ኮድ አልተሻከረም')}: ${result.error}`, 4500);
      else if (result) fireToast(t('✓ Join code reset', '✓ ኮድ ተሻከረ'), 2000);
      else fireToast(t('Failed to reset join code', 'ኮድ አልተሻከረም'), 3000);
    } catch (err) {
      fireToast(`${t('Failed to reset join code', 'ኮድ አልተሻከረም')}: ${err?.message || ''}`, 4500);
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3.5" style={{ background: shopProfile?.join_code ? 'var(--color-bg-accent-amber)' : 'var(--color-surface-subtle)' }}>
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-black text-gray-900">{t('Join code', 'የመቀላቀል ኮድ')}</span>
        </div>
        {shopProfile?.join_code ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-lg font-black tracking-[0.3em] font-mono select-all" style={{ color: 'var(--color-primary)' }}>
                {shopProfile.join_code}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shopProfile.join_code);
                    fireToast(t('✓ Code copied', '✓ ኮድ ተቀድሷል'), 1500);
                  } catch {}
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
              >
                {t('Copy', 'ቅዳ')}
              </button>
              {'share' in navigator && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: t('Join code', 'የመቀላቀል ኮድ'),
                        text: t('Use this code to join my shop: ', 'እንደምትቀላቀሉ ኮድ: ') + shopProfile.join_code
                      });
                    } catch {}
                  }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700"
                  style={{ background: 'var(--color-border)' }}
                >
                  {t('Share', 'አጋራ')}
                </button>
              )}
              <button
                type="button"
                onClick={handleRotate}
                disabled={rotating}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 press-scale"
                style={{
                  background: rotating ? 'var(--color-bg-disabled)' : 'var(--color-warning-bg)',
                  color: rotating ? 'var(--color-text-soft)' : 'var(--color-warning)'
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {rotating ? t('Resetting…', 'ያስቀምጠል…') : t('Reset code', 'ኮድ ለአዲስ')}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              {t('Staff install the app, enter this code, and join. You can change their role from the list below.',
                'ሰራተኞች ኮዱን አስገብተው ይቀላቀላሉ። ሚናቸውን ከዚህ በታች መቀየር ይችላሉ።')}
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={async () => {
                if (!onRotateJoinCode) return;
                try {
                  const result = await onRotateJoinCode(shopProfile?.shop_id || shopProfile?.id);
                  if (result?.error) fireToast(`${t('Failed to generate join code', 'ኮድ አልተፈጠረም')}: ${result.error}`, 4500);
                  else if (result) fireToast(t('✓ Join code generated', '✓ የመቀላቀል ኮድ ተፈጠረ'), 2000);
                  else fireToast(t('Failed to generate join code', 'ኮድ አልተፈጠረም'), 3000);
                } catch (err) {
                  fireToast(`${t('Failed to generate join code', 'ኮድ አልተፈጠረም')}: ${err?.message || ''}`, 4500);
                }
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--color-accent-amber)', color: 'var(--color-warning)', background: 'var(--color-bg-accent-amber)' }}
            >
              <KeyRound className="w-4 h-4" />
              {t('Generate join code for staff', 'የመቀላቀል ኮድ ፍጠር')}
            </button>
            <p className="text-[10px] text-gray-500 mt-2">
              {t('Generate a code to share with staff so they can join your shop.', 'ሰራተኞች እንዲቀላቀሉ ኮድ ይፍጠሩ።')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
