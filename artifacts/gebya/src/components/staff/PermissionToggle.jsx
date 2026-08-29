import { useStaffStore } from '../../stores/staffStore';

export default function PermissionToggle({ keyName, value, onChange, lang, disabled = false }) {
  const store = useStaffStore();
  const label = store.PERMISSION_LABELS[lang]?.[keyName] || keyName;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(keyName, !value)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: value ? 'var(--color-primary)' : 'var(--color-bg-disabled)', opacity: disabled ? 0.5 : 1 }}
      >
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(14px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}
