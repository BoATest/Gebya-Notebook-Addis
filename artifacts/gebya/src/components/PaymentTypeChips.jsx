import { useLang } from '../context/LangContext';

export const ALL_BANKS = ['CBE', 'Dashen', 'Awash', 'Abyssinia'];
export const ALL_WALLETS = ['telebirr', 'CBE Birr'];
export const DEFAULT_PROVIDERS = { banks: [...ALL_BANKS], wallets: [...ALL_WALLETS] };

function PaymentTypeChips({ paymentType, provider, onTypeChange, onProviderChange, enabledProviders }) {
  const { t } = useLang();

  const enabledBanks   = enabledProviders?.banks?.length   ? enabledProviders.banks   : ALL_BANKS;
  const enabledWallets = enabledProviders?.wallets?.length ? enabledProviders.wallets : ALL_WALLETS;

  const options = [
    { id: 'cash', label: t.cash, emoji: '💵', type: 'cash', provider: '' },
    ...enabledBanks.map(b => ({
      id: `bank:${b}`,
      label: b,
      emoji: '🏦',
      type: 'bank',
      provider: b,
    })),
    ...enabledWallets.map(w => ({
      id: `wallet:${w}`,
      label: w,
      emoji: '📱',
      type: 'wallet',
      provider: w,
    })),
    { id: 'credit', label: t.credit || 'Credit', emoji: '📒', type: 'credit', provider: '' },
  ];

  const isSelected = (opt) => {
    if (opt.type === 'cash') return paymentType === 'cash';
    if (opt.type === 'credit') return paymentType === 'credit';
    return paymentType === opt.type && provider === opt.provider;
  };

  const handlePick = (opt) => {
    onTypeChange(opt.type);
    onProviderChange(opt.provider);
  };

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {options.map(opt => {
          const selected = isSelected(opt);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePick(opt)}
              className="flex items-center justify-center gap-0.5 px-1.5 border text-[10px] font-bold transition-all press-scale"
              style={{
                flex: '1 0 auto',
                minWidth: '52px',
                minHeight: '32px',
                borderRadius: '2px',
                borderColor: selected ? '#1B4332' : '#edeae5',
                background: selected ? 'rgba(27,67,50,0.06)' : '#fff',
                color: selected ? '#1B4332' : '#9ca3af',
                whiteSpace: 'nowrap',
              }}
            >
              <span className="text-[11px]">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PaymentTypeChips;
