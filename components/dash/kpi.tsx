import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function KpiCard({ label, value, sub, data, color, icon, className }: { label: string; value: number | string; sub?: string; data: number[]; color?: string; icon?: React.ReactNode; className?: string }) {
  const half = Math.floor(data.length / 2);
  const a = data.slice(0, half).reduce((x, y) => x + y, 0), b = data.slice(half).reduce((x, y) => x + y, 0);
  const delta = a === 0 ? (b > 0 ? 100 : 0) : Math.round(((b - a) / a) * 100);
  return (
    <div className={cn('group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition hover:shadow-lift', className)}>
      <div className="flex items-center justify-between text-[13px] text-muted-foreground"><span className="flex items-center gap-2 [&_svg]:size-4">{icon}{label}</span>
        <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums', delta >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}>
          {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(delta)}%
        </span>
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</div>
      {sub ? <div className="mt-1.5 truncate text-[12px] text-muted-foreground">{sub}</div> : null}
      <Sparkline data={data} color={color} className="mt-3 h-10 w-full" />
    </div>
  );
}
