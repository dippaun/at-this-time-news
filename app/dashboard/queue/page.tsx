import Link from 'next/link';
import { getSession, currentWsId, can } from '@/lib/auth';
import { listPosts, stats } from '@/lib/queries';
import { PostCard } from '@/components/PostCard';
import { FetchNow } from '@/components/FetchNow';
export const dynamic = 'force-dynamic';
export default async function Queue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status || 'pending';
  const s = await getSession();
  const ws = await currentWsId();
  const posts = listPosts(ws, status, 90);
  const st = stats(ws);
  const tabs = [['pending', `Pending (${st.pending})`], ['approved', `Approved (${st.approved})`], ['rejected', `Rejected (${st.rejected})`], ['all', `All (${st.posts})`]];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black">Post queue</h1><p className="text-slate-500">Agriculture first, then industry, then everything else. Click a frame to open the full 1080×1350 PNG.</p></div>
        <FetchNow canRun={can(s, 'editor')} />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([k, l]) => <Link key={k} href={`/dashboard/queue?status=${k}`} className={`btn ${status === k ? 'bg-slate-900 text-white' : 'btn-ghost'}`}>{l}</Link>)}
      </div>
      {posts.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">{posts.map((p) => <PostCard key={`${p.id}-${p.rev}-${p.status}`} p={p} canEdit={can(s, 'editor')} />)}</div>
      ) : <div className="card p-10 text-center text-slate-500">No posts in this view yet.</div>}
    </div>
  );
}
