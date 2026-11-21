import Link from 'next/link';
import { Clock } from 'lucide-react';
import { SmartImage } from '@/components/ui/client';
import { Badge, focusTone } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { timeAgo, type Story } from '@/lib/queries';

const FOCUS_GU: Record<string, string> = { agri: 'ખેતી', industry: 'ઉદ્યોગ', rajkot: 'રાજકોટ', general: 'ગુજરાત' };
export const focusLabel = (f: string) => FOCUS_GU[f] || 'ગુજરાત';

function Meta({ s, light }: { s: Story; light?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]', light ? 'text-white/75' : 'text-muted-foreground')}>
      <span className="font-medium">{s.publisher}</span>
      <span className="opacity-50">•</span>
      <span className="inline-flex items-center gap-1"><Clock className="size-3" />{timeAgo(s.published_at)}</span>
    </div>
  );
}

export function StoryCard({ s, variant = 'default', className, priority }: { s: Story; variant?: 'lead' | 'default' | 'compact' | 'row'; className?: string; priority?: boolean }) {
  const href = `/story/${s.id}`;
  if (variant === 'lead') {
    return (
      <Link href={href} className={cn('group relative block overflow-hidden rounded-3xl border bg-card shadow-lift', className)}>
        <SmartImage src={s.image_url} focus={s.focus} label={focusLabel(s.focus)} className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.03] sm:aspect-[16/10] md:aspect-[16/9]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-brand-red text-white">{focusLabel(s.focus)}</Badge>
            {s.category ? <Badge className="border-white/20 bg-white/10 text-white backdrop-blur">{s.category}</Badge> : null}
          </div>
          <h2 className="gu text-balance text-2xl font-extrabold leading-tight text-white md:text-4xl">{s.title}</h2>
          <p className="gu mt-3 line-clamp-2 max-w-3xl text-[15px] text-white/80 md:text-base">{s.summary}</p>
          <div className="mt-4"><Meta s={s} light /></div>
        </div>
      </Link>
    );
  }
  if (variant === 'compact') {
    return (
      <Link href={href} className={cn('group flex gap-3 rounded-2xl p-2 transition hover:bg-muted/70', className)}>
        <SmartImage src={s.image_url} focus={s.focus} label={focusLabel(s.focus)} className="aspect-[4/3] w-28 shrink-0 rounded-xl md:w-32" />
        <div className="min-w-0 py-0.5">
          <Badge tone={focusTone(s.focus)} className="mb-1.5">{focusLabel(s.focus)}</Badge>
          <h3 className="gu line-clamp-3 text-[15px] font-bold leading-snug transition group-hover:text-primary">{s.title}</h3>
          <div className="mt-1.5"><Meta s={s} /></div>
        </div>
      </Link>
    );
  }
  if (variant === 'row') {
    return (
      <Link href={href} className={cn('group flex items-start gap-4 border-b py-4 last:border-0', className)}>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2"><Badge tone={focusTone(s.focus)}>{focusLabel(s.focus)}</Badge><Meta s={s} /></div>
          <h3 className="gu line-clamp-2 text-[16px] font-bold leading-snug transition group-hover:text-primary">{s.title}</h3>
          <p className="gu mt-1 line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
        </div>
        <SmartImage src={s.image_url} focus={s.focus} label={focusLabel(s.focus)} className="hidden aspect-[4/3] w-36 shrink-0 rounded-xl sm:block" />
      </Link>
    );
  }
  return (
    <Link href={href} className={cn('group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-lift', className)}>
      <SmartImage src={s.image_url} focus={s.focus} label={focusLabel(s.focus)} className="aspect-[16/10] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2"><Badge tone={focusTone(s.focus)}>{focusLabel(s.focus)}</Badge>{s.post_id ? <Badge tone="info">AI સારાંશ</Badge> : null}</div>
        <h3 className="gu line-clamp-3 text-[17px] font-bold leading-snug transition group-hover:text-primary">{s.title}</h3>
        <p className="gu line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
        <div className="mt-auto pt-1"><Meta s={s} /></div>
      </div>
    </Link>
  );
}
