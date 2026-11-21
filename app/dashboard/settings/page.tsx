import { getSession, currentWsId, can } from '@/lib/auth';
import { getWorkspace, listWorkspaces, db } from '@/lib/db';
import { listSources, listUsers } from '@/lib/queries';
import { aiStatus } from '@/lib/summarize';
import { SettingsClient } from '@/components/SettingsClient';
export const dynamic = 'force-dynamic';
export default async function Settings() {
  const s = await getSession();
  const wsId = await currentWsId();
  const ws = getWorkspace(wsId)!;
  const sample = db().prepare("SELECT id FROM posts WHERE ws_id=? ORDER BY CASE focus WHEN 'agri' THEN 0 ELSE 1 END, id DESC LIMIT 1").get(wsId) as any;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Settings · {ws.name}</h1>
      <SettingsClient settings={ws.settings} sources={listSources(wsId)} users={can(s, 'admin') ? listUsers() : []} workspaces={listWorkspaces().map((w) => ({ id: w.id, name: w.name }))}
        isAdmin={can(s, 'admin')} samplePostId={sample?.id} ai={{ ...aiStatus(), interval: Number(process.env.FETCH_INTERVAL_MINUTES ?? 5) }} />
    </div>
  );
}
