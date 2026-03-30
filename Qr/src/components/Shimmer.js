import React from 'react';

export default function Shimmer({ className = '', variant = 'default' }) {
  const base = 'animate-pulse bg-slate-200 rounded-xl';
  return <div className={`${base} ${className}`} />;
}
