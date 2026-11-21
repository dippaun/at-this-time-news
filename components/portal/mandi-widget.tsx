import { Sprout, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RateSet } from '@/lib/db';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
export function MandiWidget({ r, className, limit = 8 }: { r: RateSet | null; className?: string; limit?: number }) {
  return (
    <div id="mandi" className={cn('scroll-mt-28 overflow-hidden rounded-3xl border bg-card shadow-soft', className)}>
      <div className="relative overflow-hidden bg-brand-grey p-5 text-white">
        <div className="absolute -right-8 -top-10 size-36 rounded-full border-[22px] border-white/5" />
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-white/60"><Sprout className="size-3.5" /> APMC બજાર ભાવ</div>
        <div className="gu mt-1 text-xl font-extrabold">{r ? `${r.yard} માર્કેટ યાર્ડ` : 'માર્કેટ યાર્ડ ભાવ'}</div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-white/70">
          <span>{r?.date ? new Date(r.date + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
          <span className="opacity-50">•</span><span className="gu">₹ / {r?.unit || '20 કિલો'}</span>
          {r?.sample ? <Badge className="ml-auto border-white/10 bg-brand-red text-white">SAMPLE</Badge> : <Badge className="ml-auto border-white/10 bg-emerald-500 text-white">LIVE</Badge>}
        </div>
      </div>
      {r ? (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground"><th className="px-5 py-2.5 text-left font-medium">જણસી</th><th className="px-2 py-2.5 text-right font-medium">નીચો</th><th className="px-5 py-2.5 text-right font-medium">ઊંચો</th></tr></thead>
          <tbody>
            {r.rows.slice(0, limit).map((x) => (
              <tr key={x.commodity} className="border-b last:border-0 hover:bg-muted/50">
                <td className="gu px-5 py-2.5 font-semibold">{x.commodity}</td>
                <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">{fmt(x.min)}</td>
                <td className="px-5 py-2.5 text-right font-semibold tabular-nums"><span className="inline-flex items-center gap-1">{fmt(x.max)}<TrendingUp className="size-3 text-emerald-500" /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="p-6 text-sm text-muted-foreground">No rates yet.</div>}
      {r?.sample ? <div className="border-t bg-muted/40 px-5 py-2.5 text-[11px] text-muted-foreground">Sample rates for the demo. Real rates are filled in automatically when a mandi story reports them.</div> : null}
    </div>
  );
}
