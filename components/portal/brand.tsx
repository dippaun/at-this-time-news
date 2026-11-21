import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceSettings } from '@/lib/db';

/** The red/white "AT THIS TIME | MEDIA" pill used on frames, recreated in HTML. */
export function BrandMark({ s, className, compact }: { s: Pick<WorkspaceSettings, 'brandName' | 'brandTag' | 'logoUrl'>; className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-[3px] rounded-full border-2 border-brand-red bg-white p-[2px] shadow-sm', className)}>
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand-red pl-1 pr-3 text-[13px] font-extrabold tracking-wide text-white">
        {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-5 rounded-full object-cover" /> : <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand-navy"><Megaphone className="size-3 text-white" /></span>}
        {s.brandName}
      </span>
      {!compact && s.brandTag ? <span className="inline-flex h-7 items-center rounded-full bg-brand-red px-2.5 text-[13px] font-extrabold tracking-wide text-white">{s.brandTag}</span> : null}
    </span>
  );
}
