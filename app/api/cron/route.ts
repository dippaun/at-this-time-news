import { listWorkspaces } from '@/lib/db';
import { runPipeline } from '@/lib/pipeline';
export const dynamic = 'force-dynamic';
export const maxDuration = 900;
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const out: any[] = [];
  for (const ws of listWorkspaces()) out.push({ ws: ws.name, ...(await runPipeline(ws.id, 'cron')) });
  // ?wait=1 (static-site builds): also wait for the background image backfill to finish.
  if (new URL(req.url).searchParams.get('wait')) {
    const g = globalThis as any;
    await new Promise((r) => setTimeout(r, 1500));
    for (let i = 0; i < 480 && g.__gnsImgBusy; i++) await new Promise((r) => setTimeout(r, 1000));
  }
  return Response.json({ ok: true, results: out });
}
export const GET = handle;
export const POST = handle;
