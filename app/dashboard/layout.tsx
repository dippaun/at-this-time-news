import { redirect } from 'next/navigation';
import { getSession, currentWsId } from '@/lib/auth';
import { listWorkspaces, getWorkspace } from '@/lib/db';
import { listPosts, stats } from '@/lib/queries';
import { DashShell } from '@/components/dash/shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  const wsId = await currentWsId();
  const b = getWorkspace(wsId)!.settings;
  const posts = listPosts(wsId, 'all', 30).map((p) => ({ id: p.id, headline: p.headline, status: p.status }));
  return (
    <DashShell user={s} workspaces={listWorkspaces().map((w) => ({ id: w.id, name: w.name }))} wsId={wsId} brand={{ brandName: b.brandName, brandTag: b.brandTag, logoUrl: b.logoUrl }} pending={stats(wsId).pending} posts={posts}>
      {children}
    </DashShell>
  );
}
