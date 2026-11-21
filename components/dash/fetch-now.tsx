'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Zap, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FetchNow({ canRun }: { canRun: boolean }) {
  const r = useRouter();
  const [st, setSt] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const was = useRef(false);
  const [, tick] = useState(0);
  const poll = async () => {
    const j = await fetch('/api/status').then((x) => x.json()).catch(() => null);
    if (!j) return;
    if (was.current && !j.running) { r.refresh(); toast.success('Pipeline finished', { description: j.lastRun ? `${j.lastRun.new_items ?? 0} new stories · ${j.lastRun.posts ?? 0} posts framed` : undefined }); }
    was.current = !!j.running;
    setSt(j);
  };
  useEffect(() => { poll(); const t = setInterval(poll, 4000); const s = setInterval(() => tick((x) => x + 1), 1000); return () => { clearInterval(t); clearInterval(s); }; }, []); // eslint-disable-line
  const run = async () => { setBusy(true); const res = await fetch('/api/run', { method: 'POST' }); if (res.ok) toast.info('Fetching live Gujarat news…'); else toast.error('Could not start the pipeline'); await poll(); setBusy(false); };
  const next = st?.nextTick ? Math.max(0, Math.round((st.nextTick - Date.now()) / 1000)) : null;
  const ai = st?.ai;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-9 items-center gap-2 rounded-xl border bg-card px-3 text-[12px] text-muted-foreground shadow-sm">
        <span className={cn('size-2 rounded-full', st?.running ? 'animate-pulse bg-amber-500' : 'bg-emerald-500')} />
        {st?.running ? <span className="font-medium text-foreground">Pipeline running…</span> : next !== null ? <span>Next run <b className="tabular-nums text-foreground">{Math.floor(next / 60)}:{String(next % 60).padStart(2, '0')}</b></span> : <span>Connecting…</span>}
        <span className="h-4 w-px bg-border" />
        <Sparkles className={cn('size-3.5', ai?.available ? 'text-sky-500' : 'text-amber-500')} />
        <span className="font-medium text-foreground">{!ai ? '…' : ai.available ? (ai.active === 'gemini' ? 'Gemini' : 'Claude') : 'Fallback'}</span>
      </div>
      <Button disabled={!canRun || busy || st?.running} onClick={run}>{busy || st?.running ? <Loader2 className="animate-spin" /> : <Zap />}{st?.running ? 'Running' : 'Fetch now'}</Button>
    </div>
  );
}
