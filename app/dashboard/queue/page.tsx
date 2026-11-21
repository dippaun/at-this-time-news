import { Images } from 'lucide-react';
import { getSession, currentWsId, can } from '@/lib/auth';
import { listPosts, stats } from '@/lib/queries';
import { PostCard } from '@/components/dash/post-card';
import { FetchNow } from '@/components/dash/fetch-now';
import { PageHeader } from '@/components/ui/page-header';
import { TabsLink } from '@/components/ui/tabs-link';
import { EmptyState } from '@/components/ui/empty';
export const dynamic = 'force-dynamic';
export default async function Queue({ searchParams }: { searchParams: Promise<{ status?: string; tpl?: string }> }) {
  const sp = await searchParams;
  const status = sp.status || 'pending';
  const s = await getSession();
  const ws = await currentWsId();
  let posts = listPosts(ws, status, 90);
  if (sp.tpl) posts = posts.filter((p) => p.template === sp.tpl);
  const st = stats(ws);
  const q = (k: string, t?: string) => `/dashboard/queue?status=${k}${t ? `&tpl=${t}` : ''}`;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Instagram" title="Post queue" description="Preview every story as a News, Story, Mandi or Reel frame, then approve. Source names never appear on frames or captions." actions={<FetchNow canRun={can(s, 'editor')} />} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsLink active={status} items={[{ key: 'pending', label: 'Pending', count: st.pending, href: q('pending', sp.tpl) }, { key: 'approved', label: 'Approved', count: st.approved, href: q('approved', sp.tpl) }, { key: 'rejected', label: 'Rejected', count: st.rejected, href: q('rejected', sp.tpl) }, { key: 'all', label: 'All', count: st.posts, href: q('all', sp.tpl) }]} />
        <TabsLink active={sp.tpl || 'any'} items={[{ key: 'any', label: 'Any template', href: q(status) }, { key: 'news', label: 'News', href: q(status, 'news') }, { key: 'story', label: 'Story', href: q(status, 'story') }, { key: 'mandi', label: 'Mandi', href: q(status, 'mandi') }]} />
      </div>
      {posts.length ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{posts.map((p) => <PostCard key={`${p.id}-${p.rev}-${p.status}`} p={p} canEdit={can(s, 'editor')} />)}</div>
      ) : <EmptyState icon={<Images />} title={status === 'pending' ? 'All caught up' : 'No posts here yet'}>{status === 'pending' ? 'New frames land here after each pipeline run.' : 'Try another tab.'}</EmptyState>}
    </div>
  );
}
