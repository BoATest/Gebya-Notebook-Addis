import React from 'react';

export default function Skeleton({ className = '', rows = 1 }) {
  const height = rows === 1 ? '16px' : `${rows * 20}px`;
  return (
    <div className={`animate-pulse rounded-lg ${className}`} style={{ background: 'var(--color-surface-muted)', height }} />
  );
}

export function StatsSkeleton() {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="flex-1 rounded-xl" rows={3} style={{ height: '80px' }} />
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="w-full rounded-lg" rows={1} style={{ height: '48px' }} />
      ))}
    </div>
  );
}
