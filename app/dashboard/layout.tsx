import { redirect } from 'next/navigation';
import { getSession, currentWsId } from '@/lib/auth';
import { listWorkspaces, getWorkspace } from '@/lib/db';
import { DashShell } from '@/components/Shell';
export const dynamic = 'force-dynamic';
export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  const wsId = await currentWsId();
  return <DashShell user={s} workspaces={listWorkspaces().map((w) => ({ id: w.id, name: w.name }))} wsId={wsId} brand={getWorkspace(wsId)!.settings}>{children}</DashShell>;
}
