import { getSession, currentWsId, can } from '@/lib/auth';
import { getWorkspace, listWorkspaces, db } from '@/lib/db';
import { listSources, listUsers } from '@/lib/queries';
import { aiStatus } from '@/lib/summarize';
import { SettingsClient } from '@/components/dash/settings-client';
import { PageHeader } from '@/components/ui/page-header';
export const dynamic = 'force-dynamic';
export default async function Settings() {
  const s = await getSession();
  const wsId = await currentWsId();
  const ws = getWorkspace(wsId)!;
  const sample = db().prepare("SELECT id FROM posts WHERE ws_id=? AND template='news' ORDER BY CASE focus WHEN 'agri' THEN 0 ELSE 1 END, id DESC LIMIT 1").get(wsId) as any
    || db().prepare('SELECT id FROM posts WHERE ws_id=? ORDER BY id DESC LIMIT 1').get(wsId) as any;
  const mandi = db().prepare("SELECT id FROM posts WHERE ws_id=? AND template='mandi' ORDER BY id DESC LIMIT 1").get(wsId) as any;
  const { logoUrl, sponsorUrl, ...rest } = ws.settings;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={ws.name} title="Settings" description="Brand, frame templates, AI provider, sources, workspaces and team." />
      <SettingsClient settings={{ ...rest, logoUrl, sponsorUrl }} sources={listSources(wsId)} users={can(s, 'admin') ? listUsers() : []} workspaces={listWorkspaces().map((w) => ({ id: w.id, name: w.name }))}
        isAdmin={can(s, 'admin')} samplePostId={sample?.id} mandiPostId={mandi?.id} ai={{ ...aiStatus({ provider: ws.settings.aiProvider }), interval: Number(process.env.FETCH_INTERVAL_MINUTES ?? 5) }} />
    </div>
  );
}
