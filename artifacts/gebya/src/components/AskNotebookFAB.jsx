import { useLang } from '../context/LangContext';

export default function AskNotebookFAB({ onClick }) {
  const { lang } = useLang();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lang === 'am' ? 'ማስታወሻ ደብተርዎን ይጠይቁ' : 'Ask my notebook'}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 132,
        zIndex: 40,
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        background: '#1B4332',
        color: '#fff',
        fontSize: 11,
        fontWeight: 900,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(27,67,50,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        lineHeight: 1.1,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onPointerDown={e => {
        e.currentTarget.style.transform = 'scale(0.92)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(27,67,50,0.2)';
      }}
      onPointerUp={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,67,50,0.3)';
      }}
      onPointerLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,67,50,0.3)';
      }}
    >
      <span style={{ fontSize: 16 }}>⚡</span>
      <span style={{ fontSize: 8 }}>
        {lang === 'am' ? 'ጠይቅ' : 'Ask'}
      </span>
    </button>
  );
}
