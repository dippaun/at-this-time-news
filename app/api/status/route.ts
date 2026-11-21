import { getSession, currentWsId } from '@/lib/auth';
import { db, kvGet } from '@/lib/db';
import { isRunning } from '@/lib/pipeline';
import { aiStatus } from '@/lib/summarize';
export const dynamic = 'force-dynamic';
export async function GET() {
  const s = await getSession(); if (!s) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const ws = await currentWsId();
  const lastRun = db().prepare('SELECT * FROM runs WHERE ws_id=? ORDER BY id DESC LIMIT 1').get(ws);
  const counts = db().prepare("SELECT status, COUNT(*) c FROM posts WHERE ws_id=? GROUP BY status").all(ws);
  return Response.json({ running: isRunning(ws), lastRun, nextTick: Number(kvGet('next_tick') || 0), counts, ai: aiStatus() });
}
