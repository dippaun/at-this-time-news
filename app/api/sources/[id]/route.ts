import { guard, currentWsId } from '@/lib/auth';
import { db, log } from '@/lib/db';
type P = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: P) {
  const g = await guard('admin'); if ('res' in g) return g.res;
  const { id } = await params; const ws = await currentWsId(); const b = await req.json();
  const cur = db().prepare('SELECT * FROM sources WHERE id=? AND ws_id=?').get(id, ws) as any;
  if (!cur) return Response.json({ error: 'not found' }, { status: 404 });
  db().prepare('UPDATE sources SET name=?, url=?, lang=?, focus=?, enabled=? WHERE id=?')
    .run(b.name ?? cur.name, b.url ?? cur.url, b.lang ?? cur.lang, b.focus ?? cur.focus, b.enabled === undefined ? cur.enabled : b.enabled ? 1 : 0, id);
  return Response.json({ ok: true });
}
export async function DELETE(_: Request, { params }: P) {
  const g = await guard('admin'); if ('res' in g) return g.res;
  const { id } = await params; const ws = await currentWsId();
  const cur = db().prepare('SELECT name FROM sources WHERE id=? AND ws_id=?').get(id, ws) as any;
  db().prepare('DELETE FROM sources WHERE id=? AND ws_id=?').run(id, ws);
  if (cur) log(ws, 'info', `Source removed: ${cur.name}`);
  return Response.json({ ok: true });
}
