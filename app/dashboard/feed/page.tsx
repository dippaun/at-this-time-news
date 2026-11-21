/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getSession, currentWsId, can } from '@/lib/auth';
import { listItems, timeAgo } from '@/lib/queries';
import { GenerateBtn } from '@/components/GenerateBtn';
import { FetchNow } from '@/components/FetchNow';
import { AutoRefresh } from '@/components/AutoRefresh';
export const dynamic = 'force-dynamic';
const F: Record<string, string> = { agri: 'bg-emerald-100 text-emerald-800', industry: 'bg-indigo-100 text-indigo-800', rajkot: 'bg-orange-100 text-orange-800', general: 'bg-slate-100 text-slate-700' };
export default async function Feed({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const sp = await searchParams;
  const focus = sp.focus || 'all';
  const s = await getSession();
  const items = listItems(await currentWsId(), focus, 200);
  const tabs = [['all', 'All'], ['agri', '🌾 Agriculture'], ['industry', '🏭 Industry'], ['rajkot', '📍 Rajkot'], ['general', 'Gujarat']];
  return (
    <div className="space-y-6">
      <AutoRefresh seconds={60} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black">Live feed</h1><p className="text-slate-500">Deduplicated stories from all enabled sources, newest first. Priority = agri boost + industry boost + Rajkot boost.</p></div>
        <FetchNow canRun={can(s, 'editor')} />
      </div>
      <div className="flex gap-2 overflow-x-auto">{tabs.map(([k, l]) => <Link key={k} href={`/dashboard/feed?focus=${k}`} className={`btn ${focus === k ? 'bg-slate-900 text-white' : 'btn-ghost'}`}>{l}</Link>)}</div>
      <div className="card divide-y divide-slate-100">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 p-3">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">{it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : null}</div>
            <div className="min-w-0 flex-1">
              <a href={it.link} target="_blank" rel="noreferrer" className="font-semibold leading-snug hover:text-orange-700 line-clamp-2">{it.title}</a>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className={`pill ${F[it.focus]}`}>{it.category}</span>
                <span>{it.publisher}</span><span>·</span><span>{timeAgo(it.published_at)}</span><span>·</span><span>priority {it.priority.toFixed(1)}</span>
                <span className="hidden md:inline text-slate-400">via {it.source_name}</span>
              </div>
            </div>
            <GenerateBtn id={it.id} postId={it.post_id || undefined} canEdit={can(s, 'editor')} />
          </div>
        ))}
        {!items.length ? <div className="p-8 text-center text-slate-500">No stories yet.</div> : null}
      </div>
    </div>
  );
}
