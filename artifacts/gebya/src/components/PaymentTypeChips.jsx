import { useLang } from '../context/LangContext';

export const ALL_BANKS = ['CBE', 'Dashen', 'Awash', 'Abyssinia'];
export const ALL_WALLETS = ['telebirr', 'CBE Birr'];
export const DEFAULT_PROVIDERS = { banks: [...ALL_BANKS], wallets: [...ALL_WALLETS] };

function PaymentTypeChips({ paymentType, provider, onTypeChange, onProviderChange, enabledProviders, lastProviderByType }) {
  const { t } = useLang();

  const TYPES = [
    { id: 'cash',   label: t.cash,   emoji: '💵' },
    { id: 'bank',   label: t.bank,   emoji: '🏦' },
    { id: 'wallet', label: t.wallet, emoji: '📱' },
  ];

  const enabledBanks   = enabledProviders?.banks  || ALL_BANKS;
  const enabledWallets = enabledProviders?.wallets || ALL_WALLETS;

  const handleTypeChange = (newType) => {
    onTypeChange(newType);
    if (newType === 'cash') {
      onProviderChange('');
    } else if (newType === 'bank') {
      const lastBank = lastProviderByType?.bank;
      const autoBank = lastBank && enabledBanks.includes(lastBank) ? lastBank : (enabledBanks[0] || '');
      onProviderChange(autoBank);
    } else if (newType === 'wallet') {
      const lastWallet = lastProviderByType?.wallet;
      const autoWallet = lastWallet && enabledWallets.includes(lastWallet) ? lastWallet : (enabledWallets[0] || '');
      onProviderChange(autoWallet);
    }
  };

  const ChipRow = ({ items, selected, onSelect }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map(item => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(selected === item ? '' : item)}
          className="px-3 py-1.5 text-xs font-bold border-2 transition-all press-scale"
          style={{
            borderRadius: 'var(--radius-xl)',
            borderColor: selected === item ? '#1B4332' : '#e8e2d8',
            background: selected === item ? 'rgba(27,67,50,0.1)' : '#fff',
            color: selected === item ? '#1B4332' : '#6b7280',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <label className="block text-gray-700 font-semibold mb-2 text-sm font-sans">{t.paymentType}</label>
      <div className="flex gap-2">
        {TYPES.map(tp => (
          <button
            key={tp.id}
            type="button"
            onClick={() => handleTypeChange(tp.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 border-2 text-xs font-bold transition-all min-h-[56px] press-scale"
            style={{
              borderRadius: 'var(--radius-md)',
              borderColor: paymentType === tp.id ? '#1B4332' : '#e8e2d8',
              background: paymentType === tp.id ? 'rgba(27,67,50,0.07)' : '#fff',
              color: paymentType === tp.id ? '#1B4332' : '#6b7280',
            }}
          >
            <span className="text-base">{tp.emoji}</span>
            {tp.label}
          </button>
        ))}
      </div>

      {paymentType === 'bank' && enabledBanks.length === 1 && (
        <p className="text-xs mt-2 font-semibold px-1" style={{ color: '#1B4332' }}>
          ✓ {t.payingVia} {enabledBanks[0]}
        </p>
      )}
      {paymentType === 'bank' && enabledBanks.length > 1 && (
        <ChipRow items={enabledBanks} selected={provider} onSelect={onProviderChange} />
      )}

      {paymentType === 'wallet' && enabledWallets.length === 1 && (
        <p className="text-xs mt-2 font-semibold px-1" style={{ color: '#1B4332' }}>
          ✓ {t.payingVia} {enabledWallets[0]}
        </p>
      )}
      {paymentType === 'wallet' && enabledWallets.length > 1 && (
        <ChipRow items={enabledWallets} selected={provider} onSelect={onProviderChange} />
      )}
    </div>
  );
}

export default PaymentTypeChips;
