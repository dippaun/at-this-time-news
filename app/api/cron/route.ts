import { listWorkspaces } from '@/lib/db';
import { runPipeline } from '@/lib/pipeline';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const out: any[] = [];
  for (const ws of listWorkspaces()) out.push({ ws: ws.name, ...(await runPipeline(ws.id, 'cron')) });
  return Response.json({ ok: true, results: out });
}
export const GET = handle;
export const POST = handle;
