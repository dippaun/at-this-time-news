'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export function GenerateBtn({ id, postId, canEdit }: { id: number; postId?: number; canEdit: boolean }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  if (postId) return <a href={`/dashboard/queue?status=all#post-${postId}`} className="text-xs font-semibold text-emerald-700 whitespace-nowrap">✓ Post #{postId}</a>;
  if (!canEdit) return null;
  return <button disabled={busy} onClick={async () => { setBusy(true); await fetch(`/api/items/${id}/generate`, { method: 'POST' }); setBusy(false); r.refresh(); }} className="btn-ghost !px-2 !py-1 text-xs whitespace-nowrap">{busy ? 'Generating…' : '✨ Make post'}</button>;
}
