'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function FetchNow({ canRun }: { canRun: boolean }) {
  const r = useRouter();
  const [st, setSt] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const poll = async () => {
    const j = await fetch('/api/status').then((x) => x.json()).catch(() => null);
    setSt((prev: any) => { if (prev?.running && j && !j.running) r.refresh(); return j; });
    return j;
  };
  useEffect(() => { poll(); const t = setInterval(poll, 4000); return () => clearInterval(t); }, []); // eslint-disable-line
  const run = async () => { setBusy(true); await fetch('/api/run', { method: 'POST' }); await poll(); setBusy(false); };
  const next = st?.nextTick ? Math.max(0, Math.round((st.nextTick - Date.now()) / 1000)) : null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-xs text-slate-500 text-right leading-tight">
        {st?.running ? <span className="text-orange-600 font-semibold flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />Pipeline running…</span>
          : next !== null ? <>Next auto-run in <b>{Math.floor(next / 60)}m {next % 60}s</b></> : null}
        <div>AI: {st?.ai?.available ? <b className="text-emerald-600">Claude</b> : <b className="text-amber-600">Extractive fallback</b>}</div>
      </div>
      <button disabled={!canRun || busy || st?.running} onClick={run} className="btn-primary">{st?.running ? 'Running…' : '⚡ Fetch now'}</button>
    </div>
  );
}
