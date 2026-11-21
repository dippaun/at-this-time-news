'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const r = useRouter();
  useEffect(() => { const t = setInterval(() => r.refresh(), seconds * 1000); return () => clearInterval(t); }, [r, seconds]);
  return null;
}
