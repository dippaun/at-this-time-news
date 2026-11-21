import { currentWsId } from '@/lib/auth';
import { activity, fmtTime } from '@/lib/queries';
import { PageHeader } from '@/components/ui/page-header';
import { Badge, type Tone } from '@/components/ui/badge';
import { AutoRefresh } from '@/components/ui/client';
export const dynamic = 'force-dynamic';
const T: Record<string, Tone> = { info: 'default', warn: 'warning', error: 'danger', success: 'success' };
export default async function Activity() {
  const log = activity(await currentWsId(), 300);
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={20} />
      <PageHeader eyebrow="Audit" title="Activity log" description="Every fetch, summary, render and approval, newest first." />
      <div className="overflow-hidden rounded-2xl border bg-card font-mono text-[12.5px] shadow-soft">
        {log.map((l) => (
          <div key={l.id} className="flex flex-wrap items-start gap-3 border-b px-4 py-2.5 last:border-0 hover:bg-muted/40">
            <span className="w-44 shrink-0 text-muted-foreground">{fmtTime(l.ts)}</span>
            <Badge tone={T[l.level]} className="w-16 justify-center uppercase">{l.level}</Badge>
            <span className="min-w-[200px] flex-1 font-sans text-[13px]">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
