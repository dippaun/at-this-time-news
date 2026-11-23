import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CITIES } from '@/lib/queries';
import { feedHref, STATIC } from '@/lib/site';

const FOCI = [['all', 'બધા'], ['agri', 'ખેતી'], ['industry', 'ઉદ્યોગ'], ['rajkot', 'રાજકોટ'], ['general', 'ગુજરાત']];
const chip = (on: boolean) => cn('gu inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition', on ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground');

export function FilterChips({ focus = 'all', city = '' }: { focus?: string; city?: string }) {
  const q = (f: string, c: string) => feedHref(STATIC && c ? '' : f, c);
  return (
    <div className="space-y-2">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">{FOCI.map(([k, l]) => <Link key={k} href={q(k, city)} scroll={false} className={chip(focus === k)}>{l}</Link>)}</div>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        {CITIES.map((c) => <Link key={c.key} href={q(focus, city === c.key ? '' : c.key)} scroll={false} className={cn(chip(city === c.key), 'h-7 text-[12px]')}>{c.gu}</Link>)}
      </div>
    </div>
  );
}
