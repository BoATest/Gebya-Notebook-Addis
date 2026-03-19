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
          className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all"
          style={{
            borderColor: selected === item ? '#c47c1a' : '#e8d5b0',
            background: selected === item ? '#fde68a' : '#fff',
            color: selected === item ? '#92400e' : '#6b7280',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <label className="block text-gray-700 font-semibold mb-2 text-sm">{t.paymentType}</label>
      <div className="flex gap-2">
        {TYPES.map(tp => (
          <button
            key={tp.id}
            type="button"
            onClick={() => handleTypeChange(tp.id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-xs font-bold transition-all min-h-[56px]"
            style={{
              borderColor: paymentType === tp.id ? '#c47c1a' : '#e8d5b0',
              background: paymentType === tp.id ? '#fffbeb' : '#fff',
              color: paymentType === tp.id ? '#92400e' : '#6b7280',
            }}
          >
            <span className="text-base">{tp.emoji}</span>
            {tp.label}
          </button>
        ))}
      </div>

      {paymentType === 'bank' && enabledBanks.length === 1 && (
        <p className="text-xs text-amber-700 mt-2 font-semibold px-1">
          ✓ {t.payingVia} {enabledBanks[0]}
        </p>
      )}
      {paymentType === 'bank' && enabledBanks.length > 1 && (
        <ChipRow items={enabledBanks} selected={provider} onSelect={onProviderChange} />
      )}

      {paymentType === 'wallet' && enabledWallets.length === 1 && (
        <p className="text-xs text-amber-700 mt-2 font-semibold px-1">
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
