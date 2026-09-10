import React from 'react';

export default function ErrorState({ title, message, onRetry, icon = '⚠️' }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-bold text-gray-700 mb-1">{title}</div>
      <div className="text-xs text-gray-500 mb-4">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-bold px-4 py-2 rounded-lg"
          style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
        >
          {title === 'Something went wrong' ? 'Retry' : 'Try Again'}
        </button>
      )}
    </div>
  );
}

export function InlineError({ message, onRetry }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ background: 'var(--color-bg-accent-red)', color: 'var(--color-danger)' }}>
      <span>⚠️</span>
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-bold underline whitespace-nowrap">
          Retry
        </button>
      )}
    </div>
  );
}
