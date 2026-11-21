import { guard, currentWsId } from '@/lib/auth';
import { db, log } from '@/lib/db';
export async function POST(req: Request) {
  const g = await guard('admin'); if ('res' in g) return g.res;
  const ws = await currentWsId();
  const b = await req.json();
  if (!/^https?:\/\//.test(b.url || '')) return Response.json({ error: 'Valid feed URL required' }, { status: 400 });
  db().prepare('INSERT INTO sources (ws_id, name, url, lang, focus, enabled) VALUES (?,?,?,?,?,1)').run(ws, b.name || b.url, b.url, b.lang === 'gu' ? 'gu' : 'en', ['agri', 'industry', 'rajkot'].includes(b.focus) ? b.focus : 'general');
  log(ws, 'info', `Source added: ${b.name || b.url}`);
  return Response.json({ ok: true });
}
