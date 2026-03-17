import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function PrivacyToggle({ value, label = "Today's Money", suffix = 'birr', className = '' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 30000);
    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) setVisible(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const displayValue = visible
    ? `${typeof value === 'number' ? value.toLocaleString() : value} ${suffix}`
    : '****';

  return (
    <button
      onClick={() => setVisible(v => !v)}
      aria-label={visible ? 'Hide amount' : 'Tap to reveal amount'}
      className={`w-full text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer ${className}`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">{label}</span>
        {visible
          ? <Eye className="w-5 h-5 text-gray-400" />
          : <EyeOff className="w-5 h-5 text-gray-400" />
        }
      </div>
      <div className={`text-3xl font-bold tracking-tight ${visible ? 'text-emerald-600' : 'text-gray-300'}`}>
        {displayValue}
      </div>
      {!visible && (
        <div className="text-xs text-gray-400 mt-1">Tap to reveal</div>
      )}
    </button>
  );
}

export default PrivacyToggle;
