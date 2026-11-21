'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Wand2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
export function GenerateBtn({ id, postId, canEdit }: { id: number; postId?: number; canEdit: boolean }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  if (postId) return <Link href={`/dashboard/queue?status=all#post-${postId}`} className={buttonClass('ghost', 'xs', 'text-emerald-600 dark:text-emerald-400')}><Check />Post #{postId}</Link>;
  if (!canEdit) return null;
  return (
    <Button variant="outline" size="xs" disabled={busy} onClick={async () => {
      setBusy(true);
      const t = toast.loading('Summarising and rendering the frame…');
      const res = await fetch(`/api/items/${id}/generate`, { method: 'POST' });
      setBusy(false);
      if (res.ok) toast.success('Post created', { id: t }); else toast.error('Could not create the post', { id: t });
      r.refresh();
    }}>{busy ? <Loader2 className="animate-spin" /> : <Wand2 />}{busy ? 'Working' : 'Make post'}</Button>
  );
}
