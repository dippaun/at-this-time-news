import Link from 'next/link';
import { cn } from '@/lib/utils';
/** Segmented control driven by URL search params (server-friendly). */
export function TabsLink({ items, active }: { items: { href: string; label: React.ReactNode; key: string; count?: number }[]; active: string }) {
  return (
    <div className="scrollbar-none -mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
      <div className="inline-flex gap-1 rounded-xl border bg-muted/60 p-1">
        {items.map((t) => (
          <Link key={t.key} href={t.href} scroll={false} className={cn('inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition', active === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t.label}{typeof t.count === 'number' ? <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', active === t.key ? 'bg-muted' : 'bg-background/60')}>{t.count}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
