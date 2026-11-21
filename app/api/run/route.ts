import { guard, currentWsId } from '@/lib/auth';
import { runPipeline, isRunning } from '@/lib/pipeline';
export const dynamic = 'force-dynamic';
export async function POST() {
  const g = await guard('editor'); if ('res' in g) return g.res;
  const ws = await currentWsId();
  if (isRunning(ws)) return Response.json({ started: false, running: true });
  runPipeline(ws, 'manual').catch(console.error); // background
  return Response.json({ started: true, running: true });
}
