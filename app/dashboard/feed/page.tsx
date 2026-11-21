import { Rss } from 'lucide-react';
import { getSession, currentWsId, can } from '@/lib/auth';
import { listItems, timeAgo } from '@/lib/queries';
import { GenerateBtn } from '@/components/dash/generate-btn';
import { FetchNow } from '@/components/dash/fetch-now';
import { PageHeader } from '@/components/ui/page-header';
import { TabsLink } from '@/components/ui/tabs-link';
import { Badge, focusTone } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { SmartImage, AutoRefresh } from '@/components/ui/client';
export const dynamic = 'force-dynamic';
export default async function Feed({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const sp = await searchParams;
  const focus = sp.focus || 'all';
  const s = await getSession();
  const items = listItems(await currentWsId(), focus, 200).filter((i) => i.processed !== 3);
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />
      <PageHeader eyebrow="Sources" title="Live feed" description="Deduplicated stories from every enabled source, newest first. Priority = agriculture boost + industry boost + Rajkot boost." actions={<FetchNow canRun={can(s, 'editor')} />} />
      <TabsLink active={focus} items={[['all', 'All'], ['agri', 'Agriculture'], ['industry', 'Industry'], ['rajkot', 'Rajkot'], ['general', 'Gujarat']].map(([k, l]) => ({ key: k, label: l, href: `/dashboard/feed?focus=${k}` }))} />
      {items.length ? (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 border-b p-3 transition last:border-0 hover:bg-muted/40">
              <SmartImage src={it.image_url} focus={it.focus} className="aspect-[4/3] w-20 shrink-0 rounded-lg" label=" " />
              <div className="min-w-0 flex-1">
                <a href={it.link} target="_blank" rel="noreferrer" className="gu line-clamp-2 font-medium leading-snug hover:text-primary">{it.title}</a>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <Badge tone={focusTone(it.focus)}>{it.category}</Badge><span>{it.publisher}</span><span className="opacity-40">•</span><span>{timeAgo(it.published_at)}</span>
                  <span className="hidden tabular-nums md:inline">· priority {Number(it.priority).toFixed(1)}</span><span className="hidden opacity-70 lg:inline">· via {it.source_name}</span>
                </div>
              </div>
              <GenerateBtn id={it.id} postId={it.post_id || undefined} canEdit={can(s, 'editor')} />
            </div>
          ))}
        </div>
      ) : <EmptyState icon={<Rss />} title="No stories yet">The first fetch runs a few seconds after boot.</EmptyState>}
    </div>
  );
}
